(function(root) {
    'use strict';

    /* bilby's environment means `this` is special */
    /*jshint validthis: true*/

    /* bilby uses the !(this instanceof c) trick to remove `new` */
    /*jshint newcap: false*/

    var bilby;

    function findRegistered(registrations, args) {
        var i;
    
        for(i = 0; i < registrations.length; i++) {
            if(registrations[i].predicate.apply(this, args))
                return registrations[i].f;
        }
    
        throw new Error("Method not implemented for this input");
    }
    
    function makeMethod(registrations) {
        return function() {
            var args = [].slice.call(arguments);
            return findRegistered(registrations, args).apply(this, args);
        };
    }
    
    function environment(methods, properties) {
        var i;
    
        if(!(this instanceof environment) || (typeof this.method != 'undefined' && typeof this.property != 'undefined'))
            return new environment(methods, properties);
    
        methods = methods || {};
        properties = properties || {};
    
        for(i in methods) {
            this[i] = makeMethod(methods[i]);
        }
    
        for(i in properties) {
            this[i] = properties[i];
        }
    
        this.method = curry(function(name, predicate, f) {
            var newMethods = extend(methods, singleton(name, (methods[name] || []).concat({
                predicate: predicate,
                f: f
            })));
            return environment(newMethods, properties);
        });
    
        this.property = curry(function(name, value) {
            var newProperties = extend(properties, singleton(name, value));
            return environment(methods, newProperties);
        });
    
        this.extend = function(extraMethods, extraProperties) {
            var newMethods = {},
                newProperties = {},
                i;
    
            for(i in methods) {
                newMethods[i] = methods[i].concat(extraMethods[i]);
            }
            for(i in extraMethods) {
                if(i in newMethods) continue;
                newMethods[i] = extraMethods[i];
            }
    
            return environment(
                newMethods,
                extend(properties, extraProperties)
            );
        };
    
        this.append = function(e) {
            return e.extend(methods, properties);
        };
    }
    
    environment.concat = function(es) {
        // Before environment is setup; can't use a generic monoid concat.
        var accum = environment(),
            i;
    
        for(i = 0; i < es.length; i++) {
            accum = accum.append(es[i]);
        }
    
        return accum;
    };
    

    bilby = environment();
    bilby = bilby.property('environment', environment);

    function bind(f) {
        return function(o) {
            if(f.bind)
                return f.bind.apply(f, [o].concat([].slice.call(arguments, 1)));
    
            var length = f._length || f.length,
                args = [].slice.call(arguments, 1),
                g = function() {
                    return f.apply(o || this, args.concat([].slice.call(arguments)));
                };
    
            // Can't override length but can set _length for currying
            g._length = length - args.length;
    
            return g;
        };
    }
    
    function curry(f) {
        return function() {
            var g = bind(f).apply(f, [this].concat([].slice.call(arguments))),
                // Special hack for polyfilled Function.prototype.bind
                length = g._length || g.length;
    
            if(length === 0)
                return g();
    
            return curry(g);
        };
    }
    
    function compose(f, g) {
        return function() {
            return f(g.apply(this, [].slice.call(arguments)));
        };
    }
    
    function error(s) {
        return function() {
            throw new Error(s);
        };
    }
    
    function identity(o) {
        return o;
    }
    
    function constant(c) {
        return function() {
            return c;
        };
    }
    
    function zip(a, b) {
        var accum = [],
            i;
        for(i = 0; i < Math.min(a.length, b.length); i++) {
            accum.push([a[i], b[i]]);
        }
    
        return accum;
    }
    
    // TODO: Make into an Option semigroup#append
    function extend(a, b) {
        var o = {},
            i;
    
        for(i in a) {
            o[i] = a[i];
        }
        for(i in b) {
            o[i] = b[i];
        }
    
        return o;
    }
    
    function singleton(k, v) {
        var o = {};
        o[k] = v;
        return o;
    }
    
    var isTypeOf = curry(function(s, o) {
        return typeof o == s;
    });
    var isFunction = isTypeOf('function');
    var isBoolean = isTypeOf('boolean');
    var isNumber = isTypeOf('number');
    var isString = isTypeOf('string');
    function isArray(a) {
        if(Array.isArray) return Array.isArray(a);
        return Object.prototype.toString.call(a) === "[object Array]";
    }
    var isInstanceOf = curry(function(c, o) {
        return o instanceof c;
    });
    
    var AnyVal = {};
    var Char = {};
    function arrayOf(type) {
        if(!(this instanceof arrayOf))
            return new arrayOf(type);
    
        this.type = type;
    }
    var isArrayOf = isInstanceOf(arrayOf);
    function objectLike(props) {
        if(!(this instanceof objectLike))
            return new objectLike(props);
    
        this.props = props;
    }
    var isObjectLike = isInstanceOf(objectLike);
    
    var or = curry(function(a, b) {
        return a || b;
    });
    var and = curry(function(a, b) {
        return a && b;
    });
    var add = curry(function(a, b) {
        return a + b;
    });
    var strictEquals = curry(function(a, b) {
        return a === b;
    });
    
    function liftA2(f, a, b) {
        return this['*'](this['<'](a, f), b);
    }
    
    function sequence(m, a) {
        var env = this;
    
        if(!a.length)
            return env.pure(m, []);
    
        return env['>='](a[0], function(x) {
            return env['>='](env.sequence(m, a.slice(1)), function(y) {
                return env.pure(m, [x].concat(y));
            });
        });
    }
    
    bilby = bilby
        .property('bind', bind)
        .property('curry', curry)
        .property('compose', compose)
        .property('error', error)
        .property('identity', identity)
        .property('constant', constant)
        .property('zip', zip)
        .property('extend', extend)
        .property('singleton', singleton)
        .property('isTypeOf',  isTypeOf)
        .property('isArray', isArray)
        .property('isBoolean', isBoolean)
        .property('isFunction', isFunction)
        .property('isNumber', isNumber)
        .property('isString', isString)
        .property('isInstanceOf', isInstanceOf)
        .property('AnyVal', AnyVal)
        .property('Char', Char)
        .property('arrayOf', arrayOf)
        .property('isArrayOf', isArrayOf)
        .property('objectLike', objectLike)
        .property('isObjectLike', isObjectLike)
        .property('or', or)
        .property('and', and)
        .property('add', add)
        .property('strictEquals', strictEquals)
        .property('liftA2', liftA2)
        .property('sequence', sequence);
    

    // Gross mutable global
    var doQueue;
    
    // Boilerplate
    function Do() {
        if(arguments.length)
            throw new TypeError("Arguments given to Do. Proper usage: Do()(arguments)");
    
        var env = this,
            oldDoQueue = doQueue;
    
        doQueue = [];
        return function(n) {
            var op, x, i;
            if(!doQueue.length) {
                doQueue = oldDoQueue;
                return n;
            }
    
            if(n === true) op = '>=';
            if(n === false) op = '<';
            if(n === 0) op = '>>';
            if(n === 1) op = '*';
            if(n === doQueue.length) op = '+';
    
            if(!op) {
                doQueue = oldDoQueue;
                throw new Error("Couldn't determine Do operation. Could be ambiguous.");
            }
    
            x = doQueue[0];
            for(i = 1; i < doQueue.length; i++) {
                x = env[op](x, doQueue[i]);
            }
    
            doQueue = oldDoQueue;
            return x;
        };
    }
    Do.setValueOf = function(proto) {
        var oldValueOf = proto.valueOf;
        proto.valueOf = function() {
            if(doQueue === undefined)
                return oldValueOf.call(this);
    
            doQueue.push(this);
            return 1;
        };
    };
    
    bilby = bilby.property('Do', Do);
    

    bilby = bilby
        .method('<', isFunction, function(a, b) {
            return compose(b, a);
        })
        .method('*', isFunction, function(a, b) {
            return function(x) {
                return a(x)(b(x));
            };
        });
    
    bilby = bilby
        .method('>>', isFunction, function(a, b) {
            var env = this;
            return function(x) {
                return env['>='](a(x), b);
            };
        })
    
        .method('equal', isBoolean, strictEquals)
        .method('equal', isNumber, strictEquals)
        .method('equal', isString, strictEquals)
        .method('equal', isArray, function(a, b) {
            var env = this;
            return env.fold(zip(a, b), true, function(a, t) {
                return a && env.equal(t[0], t[1]);
            });
        })
    
        .method('fold', isArray, function(a, b, c) {
            var i;
            for(i = 0; i < a.length; i++) {
                b = c(b, a[i]);
            }
            return b;
        })
    
        .method('>=', isArray, function(a, b) {
            var accum = [],
                i;
    
            for(i = 0; i < a.length; i++) {
                accum = accum.concat(b(a[i]));
            }
    
            return accum;
        })
        .method('<', isArray, function(a, b) {
            var accum = [],
                i;
    
            for(i = 0; i < a.length; i++) {
                accum[i] = b(a[i]);
            }
    
            return accum;
        })
        .method('*', isArray, function(a, b) {
            var accum = [],
                i,
                j;
    
            for(i = 0; i < a.length; i++) {
                for(j = 0; j < b.length; j++) {
                    accum.push(a[i](b[j]));
                }
            }
    
            return accum;
        })
        .method('+', isArray, function(a, b) {
            return a.concat(b);
        })
        .method('pure', strictEquals(Array), function(m, a) {
            return [a];
        })
    
        .method('+', bilby.liftA2(or, isNumber, isString), function(a, b) {
            return a + b;
        })
    
        .property('oneOf', function(a) {
            return a[Math.floor(this.randomRange(0, a.length))];
        })
        .property('randomRange', function(a, b) {
            return Math.random() * (b - a) + a;
        })
    
        .method('arb', isArrayOf, function(a, s) {
            var accum = [],
                length = this.randomRange(0, s),
                i;
    
            for(i = 0; i < length; i++) {
                accum.push(this.arb(a.type, s - 1));
            }
    
            return accum;
        })
        .method('arb', isObjectLike, function(a, s) {
            var o = {},
                i;
    
            for(i in a.props) {
                o[i] = this.arb(a.props[i]);
            }
    
            return o;
        })
        .method('arb', strictEquals(AnyVal), function(a, s) {
            var types = [Boolean, Number, String];
            return this.arb(this.oneOf(types), s - 1);
        })
        .method('arb', strictEquals(Array), function(a, s) {
            return this.arb(arrayOf(AnyVal), s - 1);
        })
        .method('arb', strictEquals(Boolean), function(a, s) {
            return Math.random() < 0.5;
        })
        .method('arb', strictEquals(Char), function(a, s) {
            return String.fromCharCode(Math.floor(this.randomRange(32, 127)));
        })
        .method('arb', strictEquals(Number), function(a, s) {
            // Half the number of bits to represent Number.MAX_VALUE
            var bits = 511,
                variance = Math.pow(2, (s * bits) / this.goal);
            return this.randomRange(-variance, variance);
        })
        .method('arb', strictEquals(Object), function(a, s) {
            var o = {},
                length = this.randomRange(0, s),
                i;
    
            for(i = 0; i < length; i++) {
                o[this.arb(String, s - 1)] = this.arb(arrayOf(AnyVal), s - 1);
            }
    
            return o;
        })
        .method('arb', strictEquals(String), function(a, s) {
            return this.arb(arrayOf(Char), s - 1).join('');
        })
    
        .method('shrink', isBoolean, function() {
            return function(b) {
                return b ? [False] : [];
            };
        })
        .method('shrink', isNumber, function(n) {
            var accum = [0],
                x = n;
    
            if(n < 0)
                accum.push(-n);
    
            while(x) {
                x = x / 2;
                x = x < 0 ? Math.ceil(x) : Math.floor(x);
                if(x) {
                    accum.push(n - x);
                }
            }
    
            return accum;
        })
        .method('shrink', isString, function(s) {
            var accum = [''],
                x = s.length;
    
            while(x) {
                x = Math.floor(x / 2);
                if(x) {
                    accum.push(s.substring(0, s.length - x));
                }
            }
    
            return accum;
        });
    
    Do.setValueOf(Array.prototype);
    Do.setValueOf(Function.prototype);
    

    // Option
    function some(x) {
        if(!(this instanceof some)) return new some(x);
        this.getOrElse = function() {
            return x;
        };
        this.toLeft = function() {
            return left(x);
        };
        this.toRight = function() {
            return right(x);
        };
    
        this.bind = function(f) {
            return f(x);
        };
        this.map = function(f) {
            return some(f(x));
        };
        this.apply = function(s) {
            return s.map(x);
        };
        this.append = function(s, plus) {
            return s.map(function(y) {
                return plus(x, y);
            });
        };
        Do.setValueOf(this);
    }
    
    var none = {
        getOrElse: function(x) {
            return x;
        },
        toLeft: function(r) {
            return right(r);
        },
        toRight: function(l) {
            return left(l);
        },
    
        bind: function() {
            return this;
        },
        map: function() {
            return this;
        },
        apply: function() {
            return this;
        },
        append: function() {
            return this;
        }
    };
    Do.setValueOf(none);
    
    var isOption = bilby.liftA2(or, isInstanceOf(some), strictEquals(none));
    
    
    // Either (right biased)
    function left(x) {
        if(!(this instanceof left)) return new left(x);
        this.fold = function(a, b) {
            return a(x);
        };
        this.swap = function() {
            return right(x);
        };
        this.isLeft = true;
        this.isRight = false;
        this.toOption = function() {
            return none;
        };
        this.toArray = function() {
            return [];
        };
    
        this.bind = function() {
            return this;
        };
        this.map = function() {
            return this;
        };
        this.apply = function(e) {
            return this;
        };
        this.append = function(l, plus) {
            var t = this;
            return l.fold(function(y) {
                return left(plus(x, y));
            }, function() {
                return t;
            });
        };
    }
    
    function right(x) {
        if(!(this instanceof right)) return new right(x);
        this.fold = function(a, b) {
            return b(x);
        };
        this.swap = function() {
            return left(x);
        };
        this.isLeft = false;
        this.isRight = true;
        this.toOption = function() {
            return some(x);
        };
        this.toArray = function() {
            return [x];
        };
    
        this.bind = function(f) {
            return f(x);
        };
        this.map = function(f) {
            return right(f(x));
        };
        this.apply = function(e) {
            return e.map(x);
        };
        this.append = function(r, plus) {
            return r.fold(function(x) {
                return left(x);
            }, function(y) {
                return right(plus(x, y));
            });
        };
    }
    
    var isEither = bilby.liftA2(or, isInstanceOf(left), isInstanceOf(right));
    
    
    bilby = bilby
        .property('some', some)
        .property('none', none)
        .property('isOption', isOption)
        .method('>=', isOption, function(a, b) {
            return a.bind(b);
        })
        .method('<', isOption, function(a, b) {
            return a.map(b);
        })
        .method('*', isOption, function(a, b) {
            return a.apply(b);
        })
        .method('+', isOption, function(a, b) {
            return a.append(b, this['+']);
        })
    
        .property('left', left)
        .property('right', right)
        .property('isEither', isEither)
        .method('>=', isEither, function(a, b) {
            return a.bind(b);
        })
        .method('<', isEither, function(a, b) {
            return a.map(b);
        })
        .method('*', isEither, function(a, b) {
            return a.apply(b);
        })
        .method('+', isEither, function(a, b) {
            return a.append(b, this['+']);
        });
    

    function store(setter, getter) {
        if(!(this instanceof store))
            return new store(setter, getter);
    
        this.setter = setter;
        this.getter = getter;
    
        this.map = function(f) {
            return store(compose(f, setter), getter);
        };
    }
    var isStore = isInstanceOf(store);
    
    function lens(f) {
        if(!(this instanceof lens))
            return new lens(f);
    
        this.run = function(x) {
            return f(x);
        };
    
        this.compose = function(l) {
            var t = this;
            return lens(function(x) {
                var ls = l.run(x),
                    ts = t.run(ls.getter);
    
                return store(
                    compose(ls.setter, ts.setter),
                    ts.getter
                );
            });
        };
    }
    var isLens = isInstanceOf(lens);
    
    function objectLens(k) {
        return lens(function(o) {
            return store(function(v) {
                return extend(
                    o,
                    singleton(k, v)
                );
            }, o[k]);
        });
    }
    
    bilby = bilby
        .property('store', store)
        .property('isStore', isStore)
        .method('<', isStore, function(a, b) {
            return a.map(b);
        })
    
        .property('lens', lens)
        .property('isLens', isLens)
        .property('objectLens', objectLens);
    

    function io(f) {
        if(!(this instanceof io))
            return new io(f);
    
        this.perform = function() {
            return f();
        };
    
        this.bind = function(g) {
            return io(function() {
                return g(f()).perform();
            });
        };
        Do.setValueOf(this);
    }
    
    var isIO = isInstanceOf(io);
    
    bilby = bilby
        .property('io', io)
        .property('isIO', isIO)
        .method('pure', strictEquals(io), function(m, a) {
            return io(function() {
                return a;
            });
        })
        .method('>=', isIO, function(a, b) {
            return a.bind(b);
        });
    

    function generateInputs(env, args, size) {
        return env['<'](args, function(arg) {
            return env.arb(arg, size);
        });
    }
    
    function successReporter() {
        if(!(this instanceof successReporter))
            return new successReporter();
    
        this.success = true;
        this.fold = function(a, b) {
            return a;
        };
    }
    
    function failureReporter(inputs, tries) {
        if(!(this instanceof failureReporter))
            return new failureReporter(inputs, tries);
    
        this.success = false;
        this.fold = function(a, b) {
            return b(inputs, tries);
        };
    }
    
    function findSmallest(env, property, inputs) {
        var shrunken = env['<'](inputs, env.shrink),
            smallest = [].concat(inputs),
            args,
            i,
            j;
    
        for(i = 0; i < shrunken.length; i++) {
            args = [].concat(smallest);
            for(j = 0; j < shrunken[i].length; j++) {
                args[i] = shrunken[i][j];
                if(property.apply(this, args))
                    break;
                smallest[i] = shrunken[i][j];
            }
        }
    
        return smallest;
    }
    
    function forAll(property, args) {
        var inputs,
            i;
    
        for(i = 0; i < this.goal; i++) {
            inputs = generateInputs(this, args, i);
            if(!property.apply(this, inputs))
                return failureReporter(
                    findSmallest(this, property, inputs),
                    i
                );
        }
    
        return successReporter();
    }
    
    bilby = bilby
        .property('forAll', forAll)
        .property('goal', 100);
    

    if(typeof exports != 'undefined') {
        /*jshint node: true*/
        exports = module.exports = bilby;
    } else {
        root.bilby = bilby;
    }
})(this);