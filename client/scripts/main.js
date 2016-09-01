import ngAnimate from 'angular-animate';
import ngRoute from 'angular-route';
import ngSanitize from 'angular-sanitize';
import $ from 'jquery';

const angular = window.angular;
// App module
const app = angular.module('quizApp', [
  'ngAnimate',
  'ngRoute',
  'ngSanitize',
  '720kb.socialshare',
  'd3'
]);

// Routes
app.config(['$locationProvider', $locationProvider => {
  // Use the HTML5 history API
  $locationProvider.html5Mode(true);
}]);

// Controllers
app.controller('QuizCtrl', ['$scope', '$http', $scope => {
  $scope.questions = [];
  $scope.choices = [];
  $scope.currentQuestion = {
    value: 0
  };
  $scope.userScore = {
    value: 0
  };
  $scope.quizStatus = {
    isOver: false
  };
  $scope.message = {
    text: null
  };

  angular.forEach(window.quiz.data, row => {
    $scope.questions.push(row);
    $scope.choices.push([row.choice1, row.choice2, row.choice3]);
  });
}]);

app.controller('QuestionCtrl', ['$scope', '$timeout', '$window', '$http',
  ($scope, $timeout, $window, $http) => {
    $scope.submitAnswer = function () {
      $scope.answerSubmitted = true;
      $scope.userAnswer = this.choice;
      $scope.correctAnswer = $scope.questions[$scope.currentQuestion.value].answer;

      // If this is the first question, log a start in GA
      if ($scope.currentQuestion.value === 0) {
        $window.ga('send', 'event', 'Starts', 'Quiz Started', 'Quiz Started');
      }

      // Check to see if userAnswer is correct
      if ($scope.userAnswer === $scope.correctAnswer) {
        $scope.isCorrect = true;
        $scope.userScore.value++;

        // Log correct answer in GA
        $window.ga('send', 'event',
          ($scope.currentQuestion.value < 9 ? '0' : null) +
          ($scope.currentQuestion.value + 1) + '. ' +
          $scope.questions[$scope.currentQuestion.value].question,
          'Answer Submitted', $scope.userAnswer + '*');
      } else {
        // Log incorrect answer in GA
        $window.ga('send', 'event',
          ($scope.currentQuestion.value < 9 ? '0' : null) +
          ($scope.currentQuestion.value + 1) + '. ' +
          $scope.questions[$scope.currentQuestion.value].question,
          'Answer Submitted', $scope.userAnswer);
      }

      // Display result splash
      if ($scope.answerSubmitted) {
        $scope.showSplash = true;
        $timeout(() => {
          $scope.showSplash = false;
        }, 250);
      }

      // Update progress bar
      const progress = ($scope.currentQuestion.value + 1) * 10;
      document.querySelector('.progress-bar').style.width = `${progress}%`;

      // console.log(window.responses.data[$scope.userScore.value].percentage);

      function message() {
        if ($scope.userScore.value > $scope.questions.length / 2) {
          if ($scope.userScore.value === $scope.questions.length) {
            $scope.message.text = 'first rate!';
          } else {
            $scope.message.text = 'not too shabby!';
          }
        } else {
          $scope.message.text = 'room for improvement!';
        }
      }

      function submit() {
        const baseURL = 'https://docs.google.com/a/ft.com/forms/d/e/1FAIpQLSfoF6T9t1IGLNJat8JSw_HrxkWPyrxd2mfsH2LieGl7wteU9A/formResponse?entry.550613996=';
        const submitURL = (baseURL + $scope.userScore.value);

        $http({
          method: 'POST',
          url: submitURL,
        }).then(function success(response) {
            // this callback will be called asynchronously
            // when the response is available
          return;
        }, function error(response) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
          console.log(`Submission failed with error status ${response.status}`);
        });
      }

      // Check to see if quiz is over
      if ($scope.currentQuestion.value === $scope.questions.length - 1) {
        message();
        $scope.quizStatus.isOver = true;
        // Submit score via Google Form
        submit();

        // Log completion and score in GA
        $window.ga('send', 'event', 'Completions', 'Quiz Completed');
        $window.ga('send', 'event', 'Completions', 'Score',
          $scope.userScore.value + ' out of 10');
        $window.ga('send', 'event', 'Completions', 'Score', 'Total Score',
          $scope.userScore.value);
      } else {
        $scope.currentQuestion.value++;
      }
    };
  }
]);

// Services
angular.module('d3', []).factory('d3Service', [() => {
  const d3 = window.d3;
  return d3;
}]);

// Directives
/*eslint-disable*/
app.directive('d3ArcTween', ['d3Service', function (d3Service) {
  return {
    restrict: 'EA',
    scope: true,
    link: function ($scope, $element) {
      var width = 200; // Max width of grid column
      var height = 200; // outerRadius * 2
      var τ = 2 * Math.PI; // http://tauday.com/tau-manifesto

      // An arc function with all values bound except the endAngle. So, to compute an
      // SVG path string for a given angle, we pass an object with an endAngle
      // property to the `arc` function, and it will return the corresponding string.
      var arc = d3.svg.arc()
          .innerRadius(80)
          .outerRadius(100)
          .startAngle(0);

      // Create the SVG container, and apply a transform such that the origin is the
      // center of the canvas. This way, we don't need to position arcs individually.
      var svg = d3.select($element[0]).append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('position', 'relative')
          .style('top', '-80px')
        .append('g')
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

      // Add the background arc, from 0 to 100% (τ).
      var background = svg.append('path')
          .datum({endAngle: τ})
          .style('fill', '#a7a59b')
          .attr('d', arc);

      // Add the foreground arc in orange, currently showing 12.7%.
      var foreground = svg.append('path')
          .datum({endAngle: 0})
          .style('fill', '#458b00')
          .attr('d', arc);

      // Every so often, start a transition to a new random angle. Use transition.call
      // (identical to selection.call) so that we can encapsulate the logic for
      // tweening the arc in a separate function below.
      var interval = setInterval(function () {
        foreground.transition()
            .duration(1000)
            .call(arcTween, $scope.userScore.value / $scope.questions.length * τ);
      }, 1000);

      // Creates a tween on the specified transition's "d" attribute, transitioning
      // any selected arcs from their current angle to the specified new angle.
      function arcTween(transition, newAngle) {
        // The function passed to attrTween is invoked for each selected element when
        // the transition starts, and for each element returns the interpolator to use
        // over the course of transition. This function is thus responsible for
        // determining the starting angle of the transition (which is pulled from the
        // element's bound datum, d.endAngle), and the ending angle (simply the
        // newAngle argument to the enclosing function).
        transition.attrTween('d', function (d) {
          // To interpolate between the two angles, we use the default d3.interpolate.
          // (Internally, this maps to d3.interpolateNumber, since both of the
          // arguments to d3.interpolate are numbers.) The returned function takes a
          // single argument t and returns a number between the starting angle and the
          // ending angle. When t = 0, it returns d.endAngle; when t = 1, it returns
          // newAngle; and for 0 < t < 1 it returns an angle in-between.
          var interpolate = d3.interpolate(d.endAngle, newAngle);
          // The return value of the attrTween is also a function: the function that
          // we want to run for each tick of the transition. Because we used
          // attrTween("d"), the return value of this last function will be set to the
          // "d" attribute at every tick. (It's also possible to use transition.tween
          // to run arbitrary code for every tick, say if you want to set multiple
          // attributes from a single function.) The argument t ranges from 0, at the
          // start of the transition, to 1, at the end.
          return function (t) {
            // Calculate the current arc angle based on the transition time, t. Since
            // the t for the transition and the t for the interpolate both range from
            // 0 to 1, we can pass t directly to the interpolator.
            //
            // Note that the interpolated angle is written into the element's bound
            // data object! This is important: it means that if the transition were
            // interrupted, the data bound to the element would still be consistent
            // with its appearance. Whenever we start a new arc transition, the
            // correct starting angle can be inferred from the data.
            d.endAngle = interpolate(t);
            // Lastly, compute the arc path given the updated data! In effect, this
            // transition uses data-space interpolation: the data is interpolated
            // (that is, the end angle) rather than the path string itself.
            // Interpolating the angles in polar coordinates, rather than the raw path
            // string, produces valid intermediate arcs during the transition.
            return arc(d);
          };
        });
      }
    }
  };
}]);
