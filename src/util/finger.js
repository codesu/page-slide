/**
 * some clip from below, only has the swipe(left, right, up, down) gesture
 * https://github.com/hammerjs/hammer.js
 *
 * USE EXAMPLE:
 * new Finger(domElement, {
 *     threshold: 30
 * }).on('swipeleft swiperight', (e) => {
 *     console.log('next', e);
 * });
 */

const TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';
const INPUT_START = 1;
const INPUT_MOVE = 2;
const INPUT_END = 4;
const INPUT_CANCEL = 8;

const TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

// 分割空格字符串
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

// 获取手势方向
function getDirection(x, y) {
    if (x === y) {
        return 'NONE';
    }

    if (Math.abs(x) >= Math.abs(y)) {
        return x < 0 ? 'LEFT' : 'RIGHT';
    }

    return y < 0 ? 'UP' : 'DOWN';
}


export default class Finger {
    constructor(element, options) {
        this.element = element;
        this.options = Object.assign({
            // 移动距离阈值
            threshold: 10
        }, options);
        this.handlers = {};
        this.session = {};
        this.init();
    }

    listenTouch = (e) => {
        const data = this.computeInputData(e);

        // 安卓机touchend触发不了
        // https://www.cnblogs.com/shuiyi/p/5138006.html
        if ([INPUT_END, INPUT_CANCEL].indexOf(TOUCH_INPUT_MAP[e.type]) > -1) {
            this.session = {};
            if (data.distance >= this.options.threshold) {
                this.emit(data.type, data);
            }
        }
    }

    init() {
        splitStr(TOUCH_TARGET_EVENTS)
            .forEach((event) => {
                this.element.addEventListener(event, this.listenTouch, false);
            });
    }

    // 计算距离与方向
    computeInputData(input) {
        const { session } = this;
        const pointer = TOUCH_INPUT_MAP[input.type] !== INPUT_END
            ? input.touches[0]
            : input.changedTouches[0];

        if (!session.firstInput) {
            session.firstInput = {
                clientX: pointer.clientX,
                clientY: pointer.clientY
            };
        }
        const firstInputPointer = session.firstInput;
        const deltaX = pointer.clientX - firstInputPointer.clientX;
        const deltaY = pointer.clientY - firstInputPointer.clientY;
        const direction = getDirection(deltaX, deltaY);
        let distance = 0;

        if (direction === 'DOWN' || direction === 'UP') {
            distance = Math.abs(deltaY);
        } else if (direction === 'LEFT' || direction === 'RIGHT') {
            distance = Math.abs(deltaX);
        }

        return {
            target: this.element,
            type: `SWIPE${direction}`.toLowerCase(),
            distance,
            direction
        };
    }

    // 添加监听事件
    on(events, handler) {
        if (typeof events === 'undefined' || typeof handler === 'undefined') {
            return;
        }
        const { handlers } = this;

        splitStr(events).forEach((event) => {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        });

        return this;
    }

    // 移除监听事件
    off(events, handler) {
        if (typeof events === 'undefined') {
            return;
        }
        const { handlers } = this;

        splitStr(events).forEach((event) => {
            if (!handler) {
                delete handlers[event];
            } else if (handlers[event]) {
                handlers[event].splice(handlers[event].indexOf(handler), 1);
            }
        });

        return this;
    }

    // 触发监听事件
    emit(event, data) {
        const handlers = this.handlers[event] && [...this.handlers[event]];

        if (!handlers || !handlers.length) {
            return;
        }
        let i = 0;

        while (i < handlers.length) {
            handlers[i](data);
            i++;
        }
    }

    // 销毁
    destory() {
        this.handlers = {};
        this.element = null;
        this.session = {};
        splitStr(TOUCH_TARGET_EVENTS)
            .forEach((event) => {
                this.element.removeEventListener(event, this.listenTouch);
            });
    }
}
