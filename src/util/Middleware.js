export default class Middleware {
    _caches = [];

    constructor(context) {
        this.context = context;
    }

    use(fn) {
        this._caches.push(fn);

        return this;
    }

    next = (err) => {
        const fn = this.middlewares.shift();

        if (!fn) {
            return;
        }
        if (err) {
            if (fn.length !== 3) {
                return this.next(err);
            }

            return fn.call(this, err, this.context, this.next);
        }
        if (fn.length === 3) {
            return this.next();
        }

        return fn.call(this, this.context, this.next);
    }

    fire(context) {
        Object.assign(this.context, context);
        this.use(this.destory);
        this.middlewares = this._caches.filter((fn) => {
            return typeof fn === 'function';
        });
        this.next();
    }

    destory() {
        this._caches = [];
        this.middlewares = [];
    }
}
