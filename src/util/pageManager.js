/**
 * 管理页面跳转与页面安全（下一页图片是否加载完）
 * TODO:
 * 1. image load fail, reload image & checksecurty
 */
import Finger from './finger';
import EventHandler from './eventHandler';
import Middleware from './Middleware';
import { throttle, $ } from './util';

const AnimationEventTypes = ['transitionend', 'webkitTransitionEnd', 'animationend', 'WebkitAnimationEnd'];
const MOVE = {
    ENTER: 'enter',
    EXIT: 'exit'
};

function toggle(ele, show) {
    ele.style.display = show ? 'block' : 'none';
}

function isDom(dom) {
    return typeof HTMLElement !== 'undefined'
        ? dom instanceof HTMLElement
        : dom && dom.nodeType === 1;
}

function promiseImage(link) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            resolve('success');
        };
        img.onerror = () => {
            // eslint-disable-next-line
            reject('fail');
        };
        img.src = link;
    });
}

function formatPage(page) {
    if (isDom(page)) {
        return {
            node: page
        };
    } else if (page && isDom(page.node)) {
        return page;
    }
    throw new Error(`[pageManager]: page type error, must be dom or object which shape of {
        node: dom,
        enter: 'enter class',
        exit: 'exit class',
        keep: true // whether keep this page when next page enter
    }`);
}

const bodyDom = $('body');

export default class PageManager {
    imageDict = {};
    status = 'done';
    currentTurnOp = null;

    constructor(elements = [], currentPage = -1, options) {
        this.currentIdx = currentPage;
        this.pages = elements.map(formatPage);
        this.pageSize = elements.length;
        this.options = Object.assign({
            // 每一页需要预先加载的图片，{ 0: ['1.png'], 1: ['2.png'] }
            pageImgs: {},
            // 安全翻页，确认下页图片已加载完，需要配合pageImgs，先声明好预先加载的图片
            securyTurn: true,
            // 展示翻页提示
            showTurnHint: true,
            throttle: 300,
            showNextSecure: true
        }, options);
        this.init();
    }

    init() {
        this.showDefaultPage(this.currentIdx);
        Object.keys(this.options.pageImgs)
            .map(this.loadImg)
            .reduce((m, n) => {
                return m.then(n);
            }, Promise.resolve());
    }

    bindTurn() {
        new Finger(bodyDom, {
            threshold: 60
        })
            .on('swipedown', throttle(() => {
                this.pageTurn(this.currentIdx, this.currentIdx - 1);
            }, this.options.throttle))
            .on('swipeup', throttle(() => {
                this.pageTurn(this.currentIdx, this.currentIdx + 1);
            }, this.options.throttle));
    }

    loadImg(idx) {
        if (!this.options.pageImgs[idx] || this.checkImgSecure(idx)) {
            return Promise.resolve();
        }
        const links = this.options.pageImgs[idx].filter((link) => {
            return this.imageDict[link] !== 'success';
        });

        return Promise.all(links.map((link) => {
            return promiseImage(link).catch((msg) => {
                return msg;
            });
        }))
            .then((msgs) => {
                msgs.forEach((msg, i) => {
                    this.imageDict[links[i]] = msg;
                });

                return this.checkImgSecure(idx) ? Promise.resolve() : Promise.reject();
            });
    }

    checkImgSecure(idx) {
        if (!this.options.securyTurn) {
            return true;
        }
        if (idx >= this.pageSize) {
            return false;
        }
        const imageList = this.options.pageImgs[idx];

        if (!imageList || !imageList.length) {
            return true;
        }

        return imageList.every((link) => {
            return this.imageDict[link] === 'success';
        });
    }

    pageTurn = (currentIdx, nextIdx) => {
        if (typeof nextIdx === 'undefined' || nextIdx < 0 || nextIdx >= this.pageSize) {
            return;
        }
        const context = {
            currentIdx,
            nextIdx,
            currentPage: this.pages[currentIdx],
            nextPage: this.pages[nextIdx]
        };

        if (this.status !== 'done') {
            return;
        }
        this.status = 'doing';
        const mw = new Middleware(context);

        this.currentTurnOp = mw;
        mw.use(this.checkNextPage);
        mw.use(this.hideNextSecure);
        mw.use(context.currentPage && context.currentPage.onExit);
        mw.use(this.performExit);
        mw.use(this.showPageHint);
        mw.use(this.performEnter);
        mw.use(context.nextPage.onEnter);
        mw.use(this.patchKeep);
        mw.use(this.handlePageTurnError);
        mw.use((cx, next) => {
            this.status = 'done';
            next();
        });
        mw.fire();
    }

    fastTurn(context, next) {
        toggle(context.currentPage.node, 'none');
        toggle(context.nextPage.node, 'none');
        next();
    }

    checkNextPage = (context, next) => {
        if (this.loadImg(context.nextIdx)) {
            next();
        } else {
            next(`Fail:pageTurn|checkNextPage, page[${context.nextIdx}] images load failed`);
        }
    }

    hideNextSecure = (context, next) => {
        if (context.currentPage) {
            context.currentPage.node.classList.remove('show-next');
        }
        context.nextPage.node.classList.remove('show-next');
        next();
    }

    performExit = (context, next) => {
        if (!context.currentPage) {
            next();

            return;
        }
        if (!context.currentPage.exit && !(context.currentPage.timeout && context.currentPage.timeout.exit)) {
            next();
            if (!context.currentPage.keep) {
                setTimeout(() => {
                    toggle(context.currentPage.node, false);
                }, 50);
            }

            return;
        }
        this.transitionEnd(context.currentPage, MOVE.EXIT, next);
    }

    // pritory
    // timeout > animation
    transitionEnd(page, move, next) {
        if (page[move]) {
            page.node.classList.add(page[move]);
        }

        const nextCallback = () => {
            next();
            setTimeout(() => {
                toggle(page.node, move === MOVE.ENTER);
                page.node.classList.remove(page[move]);
            }, 50);
        };

        let timer;

        if (page.timeout && typeof page.timeout[move] !== 'undefined') {
            timer = setTimeout(() => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                nextCallback();
            }, page.timeout[move]);

            return;
        }

        let flag = false;

        const handleEvent = () => {
            if (!flag) {
                flag = true;
                nextCallback();
                AnimationEventTypes.forEach((event) => {
                    EventHandler.removeEventListener(page.node, event, handleEvent);
                });
            }
        };

        AnimationEventTypes.forEach((event) => {
            EventHandler.addEventListener(page.node, event, handleEvent);
        });
    }

    performEnter = (context, next) => {
        this.currentIdx = context.nextIdx;
        toggle(context.nextPage.node, true);
        if (!context.nextPage.enter && !(context.nextPage.timeout && context.nextPage.timeout.enter)) {
            next();

            return;
        }

        this.transitionEnd(context.nextPage, MOVE.ENTER, next);
    }

    patchKeep = (context, next) => {
        if (context.currentPage && context.currentPage.keep) {
            toggle(context.currentPage.node, false);
        }
        next();
    }

    showPageHint = (context, next) => {
        if (!this.options.showNextSecure) {
            next();

            return;
        }
        if (context.nextIdx < 0 || context.nextIdx >= this.pageSize - 1) {
            next();

            return;
        }

        const showSecure = parseInt(context.nextPage.showNextSecure) || 0;
        let timer;
        const starTime = (new Date()).valueOf();

        this.loadImg(context.nextIdx + 1)
            .then(() => {
                // nice boy，要算准了:)
                const delay = showSecure - ((new Date()).valueOf() - starTime);

                timer = setTimeout(() => {
                    context.nextPage.node.classList.add('show-next');
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                }, delay);
            });
        next();
    }

    handlePageTurnError = (err, context, next) => {
        if (err) {
            throw new Error(err);
        }
        next();
    }

    // 展示默认页面
    showDefaultPage(idx = 0) {
        return new Promise((resolve, reject) => {
            this.pages.forEach((page, i) => {
                if (idx === i) {
                    this.loadImg(idx)
                        .then(() => {
                            this.bindTurn();
                            this.pageTurn(-1, 0);
                            resolve();
                        }).catch(reject);
                } else {
                    toggle(page.node, false);
                }
            });
        });
    }

    addPage(ele, pageImgs) {
        this.pages.push(formatPage(ele));
        if (pageImgs && pageImgs.length) {
            this.options.pageImgs[this.pageSize] = pageImgs;
            this.loadImg(this.pageSize);
        }
        this.pageSize = this.pageSize + 1;
    }
}
