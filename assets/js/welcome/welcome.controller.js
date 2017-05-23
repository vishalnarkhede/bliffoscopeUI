(function(angular) {
  'use strict';

    angular.module('biffloscopeWorld.welcome')
        .controller('welcomeController', function ($scope, $location, auth, bwStorageService) {
            if (bwStorageService.getItem('userDetails', 'name') && bwStorageService.getItem('userDetails', 'email')) {
                proceedToWelcomePage();
            }

            $scope.submit = function (isValid) {
                if (!isValid) { return; }

                auth.login($scope.form.name, $scope.form.email);
                proceedToWelcomePage();
            };

            function proceedToWelcomePage () {
                $location.path('/processor');
            }
        });

})(angular);
