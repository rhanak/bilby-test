var env = bilby.environment()
    .method('length', bilby.isArray, function(a) {
        return a.length;
    })
    .method('length', bilby.isString, function(s) {
        return s.length;
    })
    .property('empty', function(o) {
        return !this.length(o);
    });

env.empty([]) == true;
env.empty([1, 2, 3]) == false;

var add = bilby.curry(function(a, b) {
    return a + b;
});
add(1)(2) == 3;
add(1, 2) == 3;
