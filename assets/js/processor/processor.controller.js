(function(angular) {
  'use strict';

    angular.module('biffloscopeWorld.processor')
        /**
        * ProcessorController handles all the functionality on processor page.
        * This page contains one canvas on which we are animating all the processing
        * functionality - loading, scanning, marking of weapons etc.
        * On the same page we also have, terminal simulator. It will display the
        * instruction for user. Instructions will keep appearing after certain fixed
        * time interval or after user presses the proceed button.
        *
        * @param $scope,
        * @param $interval,
        * @param $timeout,
        * @param $uibModal,
        * @param $q,
        * @param bliffoscopeDataService      Provider for bliffoscope data.
        * @param bliffoscopeProcessorService Provider for data processor.
        * @param canvasService               Provider for navas activities/animations.
        * @param userInstructionInventory    Provider for instructions to be given to user via terminal simulator.
        */
        .controller('processorController', function (
            $scope,
            $interval,
            $timeout,
            $uibModal,
            $q,
            bliffoscopeDataService,
            bliffoscopeProcessorService,
            canvasService,
            userInstructionInventory
        ) {
            var cursorInterval,
                testData = bliffoscopeDataService.getTestData(),
                weapons = bliffoscopeDataService.getWeapons(),
                weaponPositions = bliffoscopeProcessorService.locateTargetInBliffoscopeData(
                    weapons,
                    testData
                ),
                canvas = document.getElementById('myCanvas'),
                cWeaponPositions = {};

            updateCanvasLocations();
            begin();

            $scope.$on('bwCanvas.myCanvas:resized', function () {
                updateCanvasLocations();
            });

            // When the canvas is done loading the data, or animating the loading of data
            // then proceed to scanning.
            $scope.$on('canvas.myCanvas:loaded', function () {
                proceedToScanning();
            });

            // When animation of canvas scanning is finished, go ahead with marking
            // the target positions on canvas.
            $scope.$on('canvas.myCanvas:scanned', function () {
                proceedToMarking();
            });

            function updateCanvasLocations () {
                for (var weaponType in weaponPositions) {
                    cWeaponPositions[weaponType] =
                        canvasService.mapMatrixAreasToCanvas(
                            canvas,
                            testData,
                            weaponPositions[weaponType]
                        );
                }
            }

            function begin () {
                disableProceedButton();
                canvasService.clearCanvas(canvas);
                simulateCursor();
                instructUser('intro')
                    .then(function () {
                        enableProceedButton(
                            function () {
                                canvasService.animateDataLoading(canvas, testData);
                                disableProceedButton();
                            },
                            "Load Bliffoscope Data"
                        );
                    });
            }

            // Proceed button works in close relation with terminal simulator.
            // Once terminal is done providing the instructions, we enable
            // this button - we will wait after this for user to actually click
            // and trigger the callback
            function enableProceedButton (callback, buttonText) {
                $scope.proceed = callback;
                $scope.proceedButtonText = buttonText;
            }

            // When terminal simulator is busy giving instructions, we need to disable the
            // proceed button. User can't go ahead without reading full instruction.
            function disableProceedButton () {
                $scope.proceed = false;
                $scope.proceedButtonText = 'Waiting ...';
            }

            // This function scanning part of the whole flow.
            // It will start by giving instructions to user first.
            function proceedToScanning () {
                instructUser('load')
                .then(function () {
                    // User has been instructed about scanning, and now
                    // we need to show him the button which will trigger
                    // canvas scanning.
                    enableProceedButton(
                        function () {
                            canvasService.animateCanvasScan(canvas, testData);
                            disableProceedButton();
                        },
                        "Start Scanning"
                    );
                });
            }

            // This function marking part of the whole flow.
            // It will clear the canvas first and draw the bliffoscope data
            // freshly, so that we are sure that we are not marking some random
            // places on canvas and not looking stupid.
            function proceedToMarking () {
                canvasService.clearCanvas(canvas);
                canvasService.drawDataOnCanvas(canvas, testData);
                canvasService.markAreas(
                    canvas,
                    cWeaponPositions.torpedo,
                    'red',
                    10
                );

                canvasService.markAreas(
                    canvas,
                    cWeaponPositions.starship,
                    'yellow',
                    10
                );
                makeLocatedTargetsClickable(weaponPositions, cWeaponPositions, weapons);

                instructUser('scan')
                    .then(function () {
                        enableProceedButton(proceedToThankYou, "Continue");
                    });
            }

            // Once the flow is complete, we will show "Thank You" message,
            // just for proper closure :)
            function proceedToThankYou() {
                instructUser('end')
                    .then(function () {
                        enableProceedButton(begin, "Start from begining");
                        $interval.cancel(cursorInterval);
                    });
            }

            // This function will make certain areas - targets in our case, clickable.
            // Upon clicking, we will open a modal, which will compare the target with
            // the ideal target size shape.
            function makeLocatedTargetsClickable (weaponPositions, cWeaponPositions, weapons) {
                canvas.addEventListener('click', function (e) {
                    for (var weaponType in cWeaponPositions) {
                        for (var i = 0; i < cWeaponPositions[weaponType].length; i++) {
                            var xStart = cWeaponPositions[weaponType][i].x - 10,
                                yStart = cWeaponPositions[weaponType][i].y - 10,
                                xEnd = cWeaponPositions[weaponType][i].x + cWeaponPositions[weaponType][i].w + 10,
                                yEnd = cWeaponPositions[weaponType][i].y + cWeaponPositions[weaponType][i].h + 10;

                            if (xStart < e.offsetX && xEnd > e.offsetX && yStart < e.offsetY && yEnd > e.offsetY) {
                                $uibModal.open({
                                    templateUrl: '/templates/partials/testModal.html',
                                    size: 'lg',
                                    controller: 'targetComparisonModalController',
                                    resolve: {
                                        comparisonData: function () {
                                            return {
                                                o1: bliffoscopeProcessorService.getSubMatrix(
                                                    testData,
                                                    weaponPositions[weaponType][i].x,
                                                    weaponPositions[weaponType][i].y,
                                                    weaponPositions[weaponType][i].w,
                                                    weaponPositions[weaponType][i].h
                                                ),
                                                o2: weapons[weaponType],
                                                match: '20%',
                                                weaponType: weaponType
                                            };
                                        }
                                    }

                                });
                            }
                        }
                    }
                });
            }

            // instructUser function takes care of entire functionality
            // of terminal simulator.
            // Function param `msgType` is reference to keys in userInstructionInventory service.
            function instructUser (msgType) {
                var messages = userInstructionInventory.getNextMessage(msgType),
                    deferred = $q.defer(),
                    i = 0;

                typeMessage(messages, 0, deferred);

                return deferred.promise;
            }

            // This is a separate function only for the sake of keeping code
            // readable and clean. This is used in instructUser function for
            // actual animation part of typing on terminal simulator window.
            function typeMessage (messages, index, deferred) {
                var i = 0;

                $interval(
                    function () {
                        $scope.content = messages[index].substr(0, i) + "_";
                        i++;
                    }, 25, messages[index].length
                )
                .then(function () {

                    if (undefined === messages[index + 1]) {
                        deferred.resolve();
                    } else {
                        $timeout(function () {
                            typeMessage(messages, index + 1, deferred);
                        }, 6000);
                    }

                });
            }

            // Following function will simulate the cursor in of terminal window
            // simulator. Here we basically trigger the indefinite cursor blinking,
            // and if someone again request the cursor, we will simply return
            // if the cursor is already present on terminal window.
            function simulateCursor () {
                var deferred = $q.defer();

                if (angular.isDefined(cursorInterval)) {
                    return;
                }

                cursorInterval = $interval(function () {
                    $scope.content = toggleCursorAfterMessage($scope.content);
                }, 700);
            }

            // Again, this function is only there for keeping code clean and readable.
            // All this does is to either add or remove underscore from the end of
            // certain string. We will call this function for text of terminal simutor.
            function toggleCursorAfterMessage (msg) {
                var endChar = msg.substring(msg.length - 1);

                if ("_" === endChar) {
                    msg = msg.substring(0, msg.length - 1);
                } else {
                    msg = $scope.content + "_";
                }

                return msg;
            }
        })

        /**
        * Following directive adjusts the height and width of canvas,
        * as per the parent. Width will be set to match the parent,
        * while height will be kept as 80% of the height.
        *
        * @param $window
        * @param $rootScope
        */
        .directive('bwCanvas', function ($window, $rootScope) {
            return {
                link: function (scope, element) {
                    adjustDimensions();
                    angular.element($window).bind('resize', function () {
                        adjustDimensions();
                    });

                    function adjustDimensions () {
                        var parent = element.parent();

                        // Make it visually fill the positioned parent
                        element[0].style.width ='100%';
                        element[0].style.height='80%';
                          // Set the internal size to match
                        element[0].width  = element[0].offsetWidth;
                        element[0].height = element[0].offsetHeight;

                        $rootScope.$broadcast('bwCanvas.' + element[0].attributes.id.value + ':resized');
                    }
                }
            };
        })

        /**
        * This controller handles the functionality on modal, which compares
        * two datasets on canvas.
        * It will take two datasets to be drawn on canvas as value service - comparisonData,
        * having two properties o1 and o2.
        *
        * @param $scope
        * @param $timeout
        * @param comparisonData
        * @param canvasService
        */
        .controller('targetComparisonModalController', function (
            $scope,
            $timeout,
            comparisonData,
            canvasService
        ) {
            var canvasLocatedTarget, canvasIdealTarget;

            $scope.weaponType = comparisonData.weaponType;

            // Adding timeout to make allow for DOM of modal to be loaded completely,
            // before we proceed to drawing on canvas.
            $timeout(function () {
                canvasLocatedTarget = document.getElementById('locatedTarget');
                canvasIdealTarget = document.getElementById('idealTarget');

                canvasService.drawDataOnCanvas(canvasLocatedTarget, comparisonData.o1);
                canvasService.drawDataOnCanvas(canvasIdealTarget, comparisonData.o2);
            });
        });
})(angular);
