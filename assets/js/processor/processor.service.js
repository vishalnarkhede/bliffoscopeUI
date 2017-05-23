(function(angular) {
  'use strict';

    angular.module('biffloscopeWorld.processor')
        /**
        * Following service provides functionality for various activities on canvas.
        * These activities include drawing some matrix data on canvas, animating certain
        * befaviour, such as scanning, loading data etc.
        */
        .factory('canvasService', function ($rootScope) {
            var cache = {},
                loaderWidth = 300,
                loaderHeight = 20,
                loadSpeed = 0.4,
                scannerVelocity = 5,
                /**
                * Following function will clear or erase the entire canvas.
                *
                * @param canvas {Canvas}
                */
                clearCanvas = function (canvas) {
                    var ctx = canvas.getContext('2d');

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                },
                /**
                * following function will draw the data in form of 2d array, on canvas.
                * Data we are expecting should only contain 1s and 0s.
                * Position of 1 will be drawn on canvas with filled circle, while zero will
                * be left blank.
                * User can choose to only populate certain percentage of the data.
                * So basically only given percentage of the rows from data will be drawn on canvas.
                *
                * @param canvas         {Canvas}
                * @param data           {Array}
                * @param loadPercentage {float}
                */
                drawDataOnCanvas = function (canvas, data, loadPercentage) {
                    var ctx = canvas.getContext('2d'),
                        canvasProperties = getCanvasProperties(canvas, data),
                        x, y;

                    if (undefined === loadPercentage) {
                        loadPercentage = 100;
                    }

                    ctx.save();

                    ctx.fillStyle = "green";
                    angular.forEach(data, function (row, rowIndex) {
                        y = (rowIndex + 1) * canvasProperties.ySeperator;

                        // If the required percentage of the data is drawn on canvas,
                        // that means we are done.
                        if (y > loadPercentage * canvas.height / 100) {
                            return;
                        }

                        angular.forEach(row, function (col, colIndex) {
                            if (!col) {
                                return;
                            }

                            x = (colIndex + 1) * canvasProperties.xSeperator;

                            ctx.beginPath();
                            ctx.arc(x, y, canvasProperties.radius, 0, 2 * Math.PI);
                            ctx.fill();
                        });
                    });

                    ctx.restore();
                },

                /**
                * Following function give you the properties necessary for mapping
                * matrix data (2d array) onto canvas.
                *
                * This function will get you following properties:
                *      - cWidth     : Canvas width
                *      - cHeight    : Canvas height
                *      - ySeperator : y distance betweek 2 closest points (mapped from data)
                *      - xSeperator : x distance betweek 2 closest points (mapped from data)
                *
                * @param  canvas {Canvas}
                * @param  data   {Array}
                *
                * @return        {Object}
                */
                getCanvasProperties = function (canvas, data) {
                    var cWidth = canvas.width,
                        cHeight = canvas.height,
                        ySeperator = cHeight / (data.length + 1),
                        xSeperator = cWidth / (data[0].length + 1);

                    return {
                        cWidth: cWidth,
                        cHeight: cHeight,
                        ySeperator: ySeperator,
                        xSeperator: xSeperator,
                        radius: Math.min(xSeperator, ySeperator) / 4,
                    };
                },
                /**
                * Following function will prepare the cache, which will be used
                * during the process of animation.
                * For animations on canvas, we are using requestAnimationFrame.
                * Function (which will give next frame) provided to requestAnimationFrame
                * itself needs to call the function to get the next frame.
                * So which animating, this cache will be usefull.
                *
                * @param canvas {Canvas}
                * @param data   {Array}
                */
                prepareForAnimation = function (canvas, data) {
                    var canvasPropertiesForData = getCanvasProperties(canvas, data);

                    cache = {
                        data: data,
                        canvas: canvas,
                        ctx: canvas.getContext('2d'),
                        tmpData: data,
                        startTime: null,
                        loadPercentage: 0
                    };

                    angular.merge(cache, canvasPropertiesForData);
                },
                /**
                * Following function will trigger the animatoion for data loading
                * on canvas.
                *
                * @param canvas {Canvas}
                * @param data   {Array}
                */
                animateDataLoading = function (canvas, data) {
                    prepareForAnimation(canvas, data);
                    window.requestAnimationFrame(loadCanvas);
                },

                /**
                * Following is the animatior function which provides next frame for
                * data load on canvas animation.
                */
                loadCanvas = function (timestamp) {
                    cache.ctx.clearRect(0, 0, cache.cWidth, cache.cHeight);
                    cache.loadPercentage += loadSpeed;
                    drawDataOnCanvas(cache.canvas, cache.data, cache.loadPercentage);

                    cache.ctx.save();

                    cache.ctx.fillStyle = "red";
                    cache.ctx.font = "20px serif";
                    cache.ctx.fillText(parseInt(cache.loadPercentage) + '% loaded', (cache.cWidth - loaderWidth) / 2, ((cache.cHeight - loaderHeight) / 2) - 10);
                    cache.ctx.fillRect((cache.cWidth - loaderWidth) / 2, (cache.cHeight - loaderHeight) / 2, loaderWidth * cache.loadPercentage / 100, loaderHeight);
                    cache.ctx.restore();

                    if (cache.loadPercentage <= 100) {
                        window.requestAnimationFrame(loadCanvas);
                    } else {
                        $rootScope.$broadcast('canvas.' + cache.canvas.getAttribute('id') + ':loaded');
                        // Clearing the cache, since animation is complete.
                        cache = {};
                    }
                },
                /**
                * Following function will mark the required regions on canvas with
                * colored rectangles.
                *
                * @param canvas     {Canvas}
                * @param positions  {Object} Should contain four keys: x, y, h, w.
                *                            x & y are the positios on canvas where to start marking.
                *                            h & w are height and width of rectangle to be marked.
                * @param color      {String}
                * @param padding    {integer}
                */
                markAreas = function (canvas, positions, color, padding) {
                    var ctx = canvas.getContext('2d');

                    ctx.strokeStyle = color;
                    ctx.lineWidth = 5;
                    positions.forEach(function (position) {
                        var xStart = position.x - 10,
                            yStart = position.y - 10,
                            xEnd = position.x + position.w + 10,
                            yEnd = position.y + position.h + 10;

                        ctx.beginPath();
                        ctx.moveTo(xStart,yStart);
                        ctx.lineTo(xEnd, yStart);
                        ctx.lineTo(xEnd, yEnd);
                        ctx.lineTo(xStart, yEnd);
                        ctx.closePath();
                        ctx.stroke();
                    });
                },
                /**
                * Function for animating the canvas scanning process.
                *
                * @param canvas {Canvas}
                * @param data   {Array}
                */
                animateCanvasScan = function (canvas, data) {
                    prepareForAnimation(canvas, data);
                    cache.yScannerLine = 0;
                    cache.scannerVelocity = scannerVelocity;
                    window.requestAnimationFrame(scan);
                },
                /**
                * Following function which paints the next frame of animation on canvas.
                * We use this as a callback for window.requestAnimationFrame().
                *
                */
                scan = function (timestamp) {
                    var progress;

                    if (!cache.startTime) cache.startTime = timestamp;

                    progress = timestamp - cache.startTime;

                    cache.ctx.clearRect(0, 0, cache.cWidth, cache.cHeight);
                    drawDataOnCanvas(cache.canvas, cache.data, 100);
                    cache.yScannerLine += cache.scannerVelocity;
                    if (cache.yScannerLine > cache.cHeight || cache.yScannerLine < 0) {
                        cache.scannerVelocity = (-1) * cache.scannerVelocity;
                    }
                    cache.ctx.save();

                    cache.ctx.shadowBlur = 10;
                    cache.ctx.shadowColor = "white";
                    cache.ctx.strokeStyle = "red";
                    cache.ctx.moveTo(0, cache.yScannerLine);
                    cache.ctx.lineTo(cache.cWidth, cache.yScannerLine);
                    cache.ctx.closePath();
                    cache.ctx.stroke();

                    cache.ctx.restore();
                    if (progress < 10000) {
                        window.requestAnimationFrame(scan);
                    } else {
                        $rootScope.$broadcast('canvas.' + cache.canvas.getAttribute('id') + ':scanned');
                        // Clearing the cache, since animation is complete.
                        cache = {};
                    }
                },
                /**
                * This function maps  matrix (2d array) dimensions to canvas.
                * These dimensions will be in the form of rectangle.
                * Input argument will contain array of dimensions.
                * Each dimension will contain x, y, h, w - x position, y position
                * height and with of rectangular area respectively.
                *
                *     [
                *         {
                *             x: 2,
                *             y: 5,
                *             h: 25,
                *             w: 30
                *         }
                *         {
                *             x: 57,
                *             y: 52,
                *             h: 21,
                *             w: 100
                *         }
                *         {
                *             x: 20,
                *             y: 5,
                *             h: 52,
                *             w: 30
                *         }
                *     ]
                * @param canvas  {Canvas}
                * @param data    {Array}
                * @param areas   {Array}
                */
                mapMatrixAreasToCanvas = function (canvas, data, areas) {
                    return areas.map(function (area) {
                        var ySeperator = canvas.height / (data.length + 1),
                            xSeperator = canvas.width / (data[0].length + 1);

                        return {
                            y: (area.y + 1) * ySeperator,
                            x: (area.x + 1) * xSeperator,
                            w: (area.w - 1) * xSeperator,
                            h: (area.h - 1) * ySeperator
                        };
                    });
                };

                return {
                    drawDataOnCanvas: drawDataOnCanvas,
                    animateDataLoading: animateDataLoading,
                    animateCanvasScan: animateCanvasScan,
                    markAreas: markAreas,
                    clearCanvas: clearCanvas,
                    mapMatrixAreasToCanvas: mapMatrixAreasToCanvas
                };
        })

        .factory('bliffoscopeProcessorService', function () {
            var testDataMatrix = [],
                // There are different ways of calculating this number based on
                // distribution of matching score.
                // I'm trying to keep everything simple here and not go into all
                // statistically complecated approach.
                thresholdPercentage = 0.74,

                /**
                * Convert string to matrix or 2D array.
                *
                * @param  strData {String} String data to be converted to 2D array, each character being
                *                          element of 2D array.
                * @return matrix  {Array}
                */
                convertStringToMatrix = function (strData) {
                    if (typeof strData !== 'string') {
                        throw new TypeError(
                            'convertStringToMatrix function expects param to be string. '
                            + typeof strData + ' given.'
                        );
                    }

                    var rows = strData.split("\n"),
                        matrix = [];

                    // Generate matrix out of torpedo string
                     for (var i = 0; i < rows.length; i++) {
                         matrix.push(
                             rows[i].split('').map(function (item) {
                                return ' ' === item ? 0 : 1;
                             })
                         );
                     }

                    return matrix;
                },
                /**
                * Following function gives maximum possible matching score,
                * which is the case when all the points of weapon match with
                * those on test data matrix window.
                *
                * @param targetWeaponMatrix {Array}
                */
                getMaximumMatchScore = function (targetWeaponMatrix) {
                    return targetWeaponMatrix.length * targetWeaponMatrix[0].length;
                },

                /**
                * Following function calculates matching score at certain rowIndex
                * and colIndex of testData matrix.
                *
                * @param  targetWeaponMatrix {Array}   Any target weapon matrix - torpedoMatrix | starshipMatrix
                * @param  rowIndex           {integer} Index of row in testDataMatrix at which to calculate matchinc score.
                * @param  colIndex           {integer} Index of column in testDataMatrix at which to calculate matchinc score.
                *
                * @return score              {integer} Final matching score.
                */
                calculateMatchingScore = function (targetWeaponMatrix, rowIndex, colIndex) {
                    var score = 0;

                    // targetWeaponMatrix.length => Number of rows in targetWeaponMatrix.
                    for (var i = 0; i < targetWeaponMatrix.length; i++) {
                        // targetWeaponMatrix[0].length => Number of columns in targetWeaponMatrix.
                        for (var j = 0; j < targetWeaponMatrix[0].length; j++) {
                            if (targetWeaponMatrix[i][j] === testDataMatrix[rowIndex + i][colIndex + j]) {
                                score++;
                            }
                        }
                    }

                    return score;
                },

                /**
                * This functions iterates through testDataMatrix, and checks at each index
                * whether there is a weapon. At each position we calculate the matching score.
                * Matching score is simple defined as number of points on weapon matrix that
                * match with testData matrix, if we keep the weapon matrix on test Data matrix,
                * at certain position.
                *
                * @param targetWeaponMatrix {Array} Any target weapon matrix - torpedoMatrix | starshipMatrix
                * @param threshold          {float} Min required matching score to be eligible
                *                                   for being a target (torpedo or starship).
                */
                getWeaponLocations = function (targetWeaponMatrix, threshold) {
                    var score = 0,
                        weaponLocations = [];

                    // targetWeaponMatrix.length => Number of rows in targetWeaponMatrix.
                    // testDataMatrix.length => Number of rows in testDataMatrix.
                    for (var i = 0; i <= testDataMatrix.length - targetWeaponMatrix.length; i++) {
                        // targetWeaponMatrix[0].length => Number of columns in targetWeaponMatrix.
                        // testDataMatrix[0].length => Number of columns in testDataMatrix.
                        for (var j = 0; j <= testDataMatrix[0].length - targetWeaponMatrix[0].length; j++) {
                            score = calculateMatchingScore(targetWeaponMatrix, i, j);
                            if (score > threshold) {
                                weaponLocations.push({
                                    x: j,
                                    y: i,
                                    w: targetWeaponMatrix[0].length,
                                    h: targetWeaponMatrix.length
                                });//[i, j]);
                            }
                        }
                    }

                    return weaponLocations;
                },
                getSubMatrix = function (matrix, x, y, width, height) {
                    var subMatrix = [];

                    for (var i = 0; i < height; i++) {
                        for (var j = 0; j < width; j++) {
                            if (undefined === subMatrix[i]) {
                                subMatrix[i] = [];
                            }

                            subMatrix[i][j] = matrix[i+y][j+x];
                        }
                    }

                    return subMatrix;
                },
                /**
                * Strategy that we will be following is as follow:
                * 1. We will convert string inputs (torpedo, starship and testData)
                *    to 2D array or matrix, which makes it easier for us for processing.
                * 2. Take the window size same as (ideal) weapon (torpedo or starship)
                *    and scan through test data. Try to calculate number of points that
                *    match at each position. Lets call it matching score.
                * 3. Maximum possible matching score (MPMS) will be length * height of window.
                * 4. Set certain percentage threshold on MPMS. If matching score of potential weapon
                *    crosses this threshold, then we count it as real weapon, otherwise discard
                *    it as noise.
                *
                * ASSUMPTIONS:
                * 1. Only vertical instances of torpedo and starships are present in testData.
                * 2. Input data is significantly noisy.
                *
                * @param targetWeapons {Array}
                * @param testData     {Array}
                *
                * @return                {Array}
                */
                locateTargetInBliffoscopeData = function (targetWeapons, testData) {
                    var maxMatchScore,
                        targetWeaponMatrix,
                        weaponPositions = {};

                    testDataMatrix = testData;
                    for (var weaponType in targetWeapons) {
                        targetWeaponMatrix = targetWeapons[weaponType];

                        // First, doing all the process for torpedos.
                        // Calculation of maximum possible matching score for torpedo.
                        maxMatchScore = getMaximumMatchScore(targetWeaponMatrix);
                        // Scan through testData and retrieve weapon locations.
                        weaponPositions[weaponType] = getWeaponLocations(
                            targetWeaponMatrix,
                            thresholdPercentage * maxMatchScore
                        );
                    }

                    return weaponPositions;
                };

            return {
                convertStringToMatrix: convertStringToMatrix,
                locateTargetInBliffoscopeData: locateTargetInBliffoscopeData,
                getSubMatrix: getSubMatrix
            };
        })

        /**
        * Following service is kind of an inventory for all the instructions,
        * to be given to user. Since current application is completely front-end
        * based, we are hardcoding all the messages here.
        * This can be changed to receive these messages from backend.
        */
       .factory('userInstructionInventory', function (auth) {
            var i = 0,
                messages = {
                    intro: [
                        "Hello " + auth.getUserName() + ", welcome to the life on asteroids. " +
                        "I hope you are doing fine !! ",
                        "Well, a little world. Specifically the asteroid X8483-Z-32 that you " +
                        "and Alphonso Bliffageri are stuck on. You've been stranded there ever " +
                        "since the evil Rejectos hit your spaceship with a slime torpedo fired " +
                        "from one of their spaceships. Now you and Alphonso are trying to save " +
                        "your little world from a concerted Rejectos attack. " +
                        "And the main problem you have is detecting the Rejectos spaceships and slime " +
                        "torpedos, because they're protected with cloaking devices. ",
                        "But thankfully Alphonso has invented an imaging anti-neutrino system (which he has modestly " +
                        "named the Bliffoscope) that provides the only information we have " +
                        "about their location, but its a bit noisy. ",
                        "Press the above button to load the Bliffoscope data."
                    ],
                    load: [
                        "On the right, you can see the data we received from Bliffoscope. " +
                        "Also you can see that, its very noisy and almost useless data for " +
                        "naked eye.",
                        "Once again, thankfully Vishal has invented a software to process this " +
                        "data and detect the torpedos and starships of ouf them :) ",
                        "To proceed to scanning and detecting the targets in this data, press the button above "
                    ],
                    scan: [
                        "Awesome !! Seem's like Vishal's technique for detecting targets in such a noisy data " +
                        "worked ",
                        "You can click on any of the located target, to compare it with actual targets."
                    ],
                    end: [
                        "Thank you for watching this demo :D :D. To start from begining, press the button above. "
                    ]
                };
            return {
                /**
                * Getter function for message of certain type.
                * It will return messages in form of array, so that
                * we can add separator (timelag in our case) betweek
                * those messages.
                *
                * @param id {String}
                */
                getNextMessage: function (id) {
                    return messages[id];
                }
            };
        })

        /**
        * Factory service for providing bliffoscope data.
        * Again, this can be modified to receive this data from
        * backend, but for our purpose (FE application), we are hardcoding
        * it here.
        * This service will return data in the form of 2d array (with 0s and 1s).
        *
        * @param bliffoscopeProcessorService
        */
        .factory('bliffoscopeDataService', function (bliffoscopeProcessorService) {
            var testData = `              + +    +              ++           +       +++    +     +               +    +    +   
 +  ++     +   + ++++    + +       +         +          +  +   +++     +++ +           + + +      + 
     +            + +   ++      ++  ++    + ++       +     +      +  +   +      ++   ++       +     
+   ++      +  ++       +          + +       ++        ++  +           +                  +         
 ++++++ + +    +   ++  +  +   +   +  ++      +         +                     +     ++      +     + +
  + +   +      +               +      ++     +  ++            +   +    + +     +     +   +  + +     
+++   + ++   +  +            +  +++       + +       ++                     +            +  + +  +   
  +++++  +      +                            +  + +            +   +  +        +   +             +  
 +   +   +              +    +      +            +  +   +      +    +     +    +   +                
 ++    +              +     +       ++   +          +       +           ++       +          + +     
  ++++ +        + +  +    ++ +       +                      +                    +     +         + +
+   ++  +     +      +  +  +  +    + + ++            + +   + + +    +      +   +++   ++   +     +  +
+  ++  +              +   ++   ++       +      + +++++            +    +    ++    +++  +    +    + +
 +  + +     +  + +   +           ++  ++ +  +                 + ++                           +++  +  
 +        +              +                ++    +    + +     + ++     ++ + +  + +   +            +++
 +    + ++  +   + + +     +  + ++ +   + + +    +     +  + +++  +                       +          + 
         +   ++ + + ++    +   +  ++ ++ +      +     +      ++   +   +     +     ++  +   + +     ++  
   +  +            + +     ++ +   +  ++++ ++            +  +  +    +     +      +        +  +  +    
+    +   ++++       + ++ +      ++ +                           + +      +++ +       ++ +            
 +               +     +   + ++ +   ++   +     +            + +  +  ++  +                 +  +      
 +      +              +       + ++ + +  +       + +     +  ++    +          +      + +   +++       
         +  +    ++ +     +   +++ ++  +++                        +     +      ++     +  +    ++    +
 +   +       + +         ++    + ++  ++      +  +++     ++ +  + +  +      +                 +   +   
+    +    +         + + ++  + + + + ++  + +           +  + ++     +               +            +    
+   ++        +  +             ++ ++ +++        +    ++        +  +   +    +         ++  +  +       
         +  ++ +   ++       +   + +   + ++   ++ +    +     +            +                    +   ++ 
 + +    ++ ++   +      +       +            +   +       +++ ++++++    ++             + +  +       + 
    + +  + +         +       ++    +     +     +  +     +       +  +      +  +++    +         ++    
    +           ++   +  +          ++  +    ++         ++  +  ++++++            + +  +        +    +
  +  + ++    +     +     + +       +     +           +    +  ++       + +    ++     ++   +          
 +  +     + + ++    +       +    +++     + ++ +     ++++     ++  +   +  +       ++     +           +
    ++ +     +         +       +  +       +   +  ++   +       +                   +                +
      +                 +                  +      +      +++++  ++++        + +       +++  +  ++   +
  +       +++++   +   +    +  +   +    + +   + +        +++    +  +        +    +      + + +    + + 
 +    ++       +   + +       ++      +  +   + +        +++++  + +++++++ ++ +     ++     +           
  ++++        +    +         +  +  +     + +   +++      +        ++ +  ++   + +        + + ++       
     +  +  +   +         +     +     +      + +             +     + + ++++ +    ++      ++       +  
 +               +       +      +          +                +    +    ++   ++             + + + ++  
  +     +   + +      +      +          ++           +   ++       ++++             + +       ++      
      ++    +  +         ++  +  +    +  +                +    + + + +  + +  +    +  +     + +    +  
 +            +   +     ++            + +   +   +       +   +      ++ ++  ++ +        +   ++     +  
 +    +      +  + ++ + +              +   +           +   +    + ++    +          ++   +           +
 + + +  +  ++ +  ++   +     +  + +                    +      +    + ++++++++  +  ++         ++   ++ 
  +   +  +   + +        ++          ++      +      +      ++  +         +      + ++    +  ++  +  +  
 +  +  ++    +      ++   ++  +    +       +       +      ++             +         +    +   +      ++
                 +  +++    +++          +     ++  +    +        +  +       +                   ++   
  ++                  +   + +   +++     ++        +    +  +              ++   ++      +             
  + ++ +       +             + +   ++                        +      ++    +  +   +            + +   
+       +     + ++        +   +     +      +          +     ++     + +++    +    +        ++       +
    +    +     + + +       +   +        +         +        +         + +    +         +  +   ++     
   +    +               ++  + +     +    +++   + +  ++     +    + + ++     +          +     +    ++ 
         +  +      +  + + +      +        +      +  +  +             + + +  +   + ++  +             
 +            +       ++    +  +      ++       +     +     +      +  +        ++ + ++          + + +
    ++++      +   +  +   +        ++       +              +  + + ++      + +  ++   +  +     +     ++
+     + +   +     +++   +     +     +    + +                             +    +  +  ++   +   +      
   +  + ++      + + +      + +        +   +     +     +   +       +   +            +  +             
 +    +         +    +       + + +++            +   +  ++ +  + ++   +   +          +      ++   ++ + 
    ++ ++             +   ++         +   + +       +++ +             +      +  + +  +  +       +    
 +  ++   ++             +        ++         + + +  +   + + +++   +               +    +     +      +
    +    +       +         +          +        + +   ++   +        ++           +       + ++   +    
+         + +  ++  ++    +    + ++     +   ++  +     ++  +                     + + + +   +   +      
+             +         + ++     + +  +  + +         +    +           +      + +     +  + + + +   + 
               +    ++   +++    + +         +  +  +                +    +  +    + ++   +  +   +  +  
 ++    +           ++   +   +            + ++ ++               + +              +     +    +   +    
  +    + +    +       +    +  + +++       +         +                 ++    +++   +   + ++          
            + +  +   +  +       +        +       +    +  + ++ ++              + +   +        +      
+  +         +       +    +   +       +   +          +    ++ +      ++            +           +     
           +  +++        +     +    + +        +  +             +          + +                +     
 ++++  +  +       +  +++  ++ +     + ++         ++ + +        +  +  +     + +       ++++          + 
    +   ++ +                ++++  +  +  +   ++  + +   +     + +  +          +      +   ++  ++       
 +               +   ++  ++       +         +++++ ++ ++    + ++      ++     +   +      +   +   +    
 +         +  +    +                   +  +      ++     + + +   +  ++              + +    +++ + +   
              + ++ ++  + +    +                + ++ +                 ++ +++          +     +       
+                   +   +      ++ +         +    + +        +             +        +   +        +  +
  +    +          ++         +       +   + +    +++  + ++  + +  ++  +   +          +++ +  +       ++
     +        +   +     +                  +++     + ++               +     +  +    +     + +       
  +    +       +     +         +    +   +     +  ++ +++    +   ++            ++  +          ++     +
   +  +   +   + +   +     +  +   +    +                     +  + +         +++ +   +    +           
    +   +    + +       +   + +      +    +        +   +++   +  ++        +     + + +  +    ++   ++  
    +    +    +   +         + +     + +    +++   +  +      +   +       +++    + + +  +         ++   
    +   +   +         +  +    +    +   +     +            +   + +   +     +     +             +     
 +      + +++   + + ++  + ++  ++         +      + +  + ++  +            +  +     +    ++ +   + + + +
 +  ++       +           +++ + +  +              +            + +                  ++        +   +  
                      + +  ++ + +        +++    + + +     ++ ++      +   ++ +     +   +       +    +
     +  +              +  ++  +    +               + + +      +    +   ++ ++      ++     ++   +     
  +  + + +         +      +++++  ++    +  +       + + +               +      + +            +     + 
    ++  +   +  +          +++ +  ++   +    +    +       +    +    + ++  +  ++    +   +   +     +    
       +      + +   + ++++ ++       + +  +  +    +    ++     +          + +++  ++               +   
 +       +   +      +  + +++++ + +      +   +   ++  +    +      + +      +++    +             ++    
+ +       +    +   +       + + +           +      +        +  +++  +         +          +      ++   
         +            +    ++  ++++ + +           +          + +   +  +   ++       + + +      +     
             + ++  ++    ++     +     +           ++    +        ++                  ++ +           
                     + +          +      + +  +      +    +   +   +  +    +     +    +   +  +   + + 
    +     ++   ++   +  +      + +          +     + +    +       +   +   ++ +    +        + +    ++  
+                 +          ++       +             +     + +      + +       +  +   +  +     +  ++  
       + +       + +     +  +    +  +  ++      +       ++   +                           ++ +   +    
             +  + ++      +  +    +      ++ + +                        +    + +    +    ++          
          +        +   +                    +         +     + +  + +             +   +  +           
  +     +       + +     ++   +        +++   +    +       +   + + +       +            +     ++   ++ 
        ++  +   +      +  +    +++  +  ++                  ++ + +   +                + +     +  +  +
`,
                torpedo =
`    +    
    +    
   +++   
 +++++++ 
 ++   ++ 
++  +  ++
++ +++ ++
++  +  ++
 ++   ++ 
 +++++++ 
   +++   `,
                starship = `              
  ++++++++++  
 ++        ++ 
  ++++++++++  
      ++      
      ++      
      ++      
  ++++++++++  
 ++        ++ 
  ++++++++++  
              `,
                weapons = {
                    torpedo: torpedo,
                    starship: starship
                }
            return {
                getTestData: function () {
                    return bliffoscopeProcessorService.convertStringToMatrix(testData);
                },
                getWeapons: function () {
                    var matrixWeapons = {};

                    for (var weapontype in weapons) {
                        matrixWeapons[weapontype] = bliffoscopeProcessorService.convertStringToMatrix(
                            weapons[weapontype]
                        );
                    }

                    return matrixWeapons;
                }
            }
        })

})(angular);
