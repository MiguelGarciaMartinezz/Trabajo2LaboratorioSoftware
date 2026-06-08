const app = angular.module('gestorApp', []);

app.controller('LoginController', function($scope, $window, $http) {
    $scope.usuario = {};
    $scope.mensajeError = "";

    $scope.hacerLogin = function() {
        if ($scope.usuario.user && $scope.usuario.passwd) {
            
            $http({
                method: 'POST',
                url: 'http://localhost:3000/login',
                data: { 
                    user: $scope.usuario.user, 
                    passwd: $scope.usuario.passwd 
                }
            }).then(function(response) {
                $window.sessionStorage.setItem('token', response.data.session_id);
                $window.sessionStorage.setItem('username', response.data.name);
                
                if (response.data.name === 'Administrador') {
                    $window.location.href = 'admin.html';
                } else {
                    $window.location.href = 'usuario.html';
                }
                
            }, function(error) {
                if(error.status === 401) {
                    $scope.mensajeError = "Usuario o contraseña incorrectos.";
                } else {
                    $scope.mensajeError = "Error de conexión con el servidor.";
                }
            });
            
        } else {
            $scope.mensajeError = "Por favor, rellena todos los campos.";
        }
    };
});
