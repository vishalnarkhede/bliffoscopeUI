(function(angular) {
    'use strict';

    angular.module('biffloscopeWorld')
        .config(routerConfig);

    function routerConfig($routeProvider) {
        $routeProvider.
            when('/welcome', {
                templateUrl: 'templates/welcome.html',
                controller: 'welcomeController'
            }).
            when('/processor', {
                templateUrl: 'templates/processor.html',
                controller: 'processorController'
            }).
            otherwise({
                redirectTo: '/welcome'
            });
    }
})(angular);
