export default {
    addEventListener(element, type, handler) {
        if (element && type && typeof handler === 'function') {
            if (element.addEventListener) {
                element.addEventListener(type, handler, false);
            } else if (element.attachEvent) {
                element.attachEvent(`on${type}`, handler);
            } else {
                element[`on${type}`] = handler;
            }
        }
    },
    removeEventListener(element, type, handler) {
        if (element && type && typeof handler === 'function') {
            if (element.removeEventListener) {
                element.removeEventListener(type, handler, false);
            } else if (element.detachEvent) {
                element.detachEvent(`on${type}`, handler);
            } else {
                element[`on${type}`] = null;
            }
        }
    }
};
