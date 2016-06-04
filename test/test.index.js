/**
 * mocha 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var expect = require('chai').expect;
var Redis = require('../src/index.js');
var howdo = require('blear.utils.howdo');

describe('测试文件', function () {
    it('base', function (done) {
        var redis = new Redis({
            port: 8912
        });
        var KEY = Date.now();

        redis.on('connect', function () {
            howdo
                .task(function (next) {
                    redis.get(KEY, next);
                })
                .task(function (next, val) {
                    expect(val).to.equal(null);
                    redis.set(KEY, 1, next);
                })
                .task(function (next) {
                    redis.get(KEY, next);
                })
                .task(function (next, val) {
                    expect(val).to.equal(1);
                    redis.set(KEY, 2, 1000, next);
                })
                .task(function (next) {
                    setTimeout(function () {
                        redis.get(KEY, next);
                    }, 1000);
                })
                .task(function (next, val) {
                    expect(val).to.equal(null);
                    redis.set(KEY, 3, next);
                })
                .task(function (next) {
                    redis.get(KEY, next);
                })
                .task(function (next, val) {
                    expect(val).to.equal(3);
                    redis.remove(KEY, 3);
                    next();
                })
                .task(function (next) {
                    redis.get(KEY, next);
                })
                .task(function (next, val) {
                    expect(val).to.equal(null);
                    next();
                })
                .follow(done);
        });

        redis.on('disconnect', function (err) {
            console.log(err);
            done();
        });
    });
});

