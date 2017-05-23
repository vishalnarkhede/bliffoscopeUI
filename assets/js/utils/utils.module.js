(function(angular) {
  'use strict';

    angular.module('biffloscopeWorld.utils', [])
        /**
        * This service provides the functionality for browser based storage
        * of data. We are using local storage for this purpose.
        */
        .factory('bwStorageService', function ($window, $rootScope) {
            var domain = 'bw',
                storage = $window.localStorage;

            return {
                setItem: function (namespace, id, valueArg) {
                    var value = String(valueArg);

                    storage.setItem(getKey(namespace, id), value);
                },
                getItem: function (namespace, id) {
                    var value = storage.getItem(getKey(namespace, id));

                    return value;
                },
                removeItem: function (namespace, id) {
                    storage.removeItem(getKey(namespace, id));
                },
                exists: function (namespace, id) {
                    return !!this.getItem(namespace, id);
                }
            };

            function getKey(namespace, id) {
                return [domain, namespace, id].join(':');
            }
        })

        /**
        * This is a simple and stupid service which acts as authorization
        * service for logged in user. Since this is just a front end applicationm
        * we can get away with storing username and email in local storage.
        * In case of implementation of backend part for application, we can modify
        * its functions to support authorization apis.
        *
        * @param bwStorageService
        */
        .factory('auth', function ($rootScope, bwStorageService) {
            return {
                login: function (name, email) {
                    bwStorageService.setItem('userDetails', 'name', name);
                    bwStorageService.setItem('userDetails', 'email', email);
                    $rootScope.$broadcast('auth.status:updated');
                },
                isLoggedInUser: function () {
                    var name = bwStorageService.getItem('userDetails', 'name'),
                        email = bwStorageService.getItem('userDetails', 'email');

                    if (-1 < [undefined, '', null].indexOf(name) ||
                        -1 < [undefined, '', null].indexOf(email)
                    ) {
                        return false;
                    }

                    return true;
                },
                logout: function () {
                    bwStorageService.removeItem('userDetails', 'name');
                    bwStorageService.removeItem('userDetails', 'email');
                    $rootScope.$broadcast('auth.status:updated');
                },
                getUserName: function () {
                    return bwStorageService.getItem('userDetails', 'name');
                }
            };
        })

        /**
        * Controller for top navigation of pages.
        *
        * @param $scope
        * @param $location
        * @param auth
        */
        .controller('navController', function ($scope, $location, auth) {
            refreshNavbar();
            $scope.$on('auth.status:updated', function () {
                refreshNavbar();
            });

            $scope.logout = function () {
                auth.logout();
                $location.path('/');
            };

            function refreshNavbar() {
                $scope.validUser = auth.isLoggedInUser();
                $scope.username = auth.getUserName();
            }

        });

})(angular);
