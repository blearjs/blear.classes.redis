/**
 * redis 类
 * @author ydr.me
 * @create 2016年06月04日14:09:36
 */

var redis = require('redis');
var Events = require('blear.classes.events');
var object = require('blear.utils.object');
var typeis = require('blear.utils.typeis');
var access = require('blear.utils.access');
var fun = require('blear.utils.function');
var json = require('blear.utils.json');
var date = require('blear.utils.date');


var oneDay = date.DAY_TIME;

var getTTL = function (store, sess) {
    var maxAge = sess.cookie.maxAge;
    return store.ttl || (typeof maxAge === 'number'
            ? Math.floor(maxAge / 1000)
            : oneDay / 1000);
};

var defaults = {
    url: '',
    pass: '',
    db: 0,
    expires: date.DAY_TIME
};


var Redis = Events.extend({
    className: 'Redis',
    constructor: function (options) {
        var the = this;

        Redis.parent(the);

        if (options.url) {
            options.socket = options.url;
        }

        // convert to redis connect params
        if (options.client) {
            the.client = options.client;
        }
        else if (options.socket) {
            the.client = redis.createClient(options.socket, options);
        }
        else {
            the.client = redis.createClient(options);
        }

        if (options.pass) {
            the.client.auth(options.pass, function (err) {
                if (err) {
                    throw err;
                }
            });
        }

        if (typeis.Number(options.db)) {
            the.client.select(options.db);
            the.client.on('connect', function () {
                the.client.select(options.db);
            });
        }

        the.client.on('error', function (er) {
            the.emit('disconnect', er);
        });

        the.client.on('connect', function () {
            the.emit('connect');
        });

        the[_options] = object.assign({}, defaults, options);
    },


    /**
     * 创建一个 express-session storage
     * @param session
     * @param prefix
     */
    expressSessionStorage: function (session, prefix) {
        var the = this;
        var sessionStorage = new Events();
        var maxAge = session.cookie.maxAge;
        var expires = typeis.Number(maxAge) ? maxAge : the[_options].expires;

        prefix = prefix || 'sess:';

        ['connect', 'disconnect'].forEach(function (ev) {
            the.on(ev, function () {
                var args = access.args(arguments);

                args.unshift(ev);
                sessionStorage.emit.apply(sessionStorage, args);
            });
        });

        sessionStorage.get = function (key, callback) {
            the.get(prefix + key, callback);
        };

        sessionStorage.set = function (key, val, callback) {
            the.set(prefix + key, val, expires, callback);
        };

        sessionStorage.destroy = function (key, callback) {
            the.remove(prefix + key, callback);
        };

        return sessionStorage;
    },


    /**
     * 获取键
     * @param key
     * @param callback
     * @returns {Redis}
     */
    get: function (key, callback) {
        key = String(key);
        callback = fun.noop(callback);
        this.client.get(key, function (err, reply) {
            if (err || !reply) {
                return callback(err, null);
            }

            reply = json.parse(reply.toString());
            return callback(null, reply.data || null);
        });
        return this;
    },


    /**
     * 设置键
     * @param key
     * @param val
     * @param [expires]
     * @param [callback]
     * @returns {Redis}
     */
    set: function (key, val, expires, callback) {
        key = String(key);
        var options = this[_options];
        var args = access.args(arguments);

        switch (args.length) {
            case 2:
                expires = options.expires;
                break;

            case 3:
                if (typeis.Function(args[2])) {
                    callback = args[2];
                    expires = options.expires;
                }
                break;
        }

        callback = fun.noop(callback);
        val = {data: val};
        val = json.stringify(val);
        var sett = [key, val];

        if (typeis.Date(expires)) {
            expires = expires.getTime() - Date.now();
        }

        var ttl = Math.floor(expires / 1000);

        if (ttl > 0) {
            sett.push('EX', ttl);
        }

        this.client.set(sett, callback);
        return this;
    },


    /**
     * 移除键
     * @param key
     * @param callback
     * @returns {Redis}
     */
    remove: function (key, callback) {
        key = String(key);
        this.client.del(key, callback);
        return this;
    },


    /**
     * 销毁实例
     */
    destroy: function () {
        this.client.quit();
        Redis.parent.destroy(this);
    }
});
var _options = Redis.sole();

Redis.defaults = defaults;
module.exports = Redis;


