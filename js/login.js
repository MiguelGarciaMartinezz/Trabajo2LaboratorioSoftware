//creación de la app angular
const app = angular.module('gestorApp', []);

//creación del controlador de login
//scope es el objeto que contiene los datos y funciones que se van a usar en la vista
//window es el objeto que representa la ventana del navegador
//http es el objeto que permite hacer peticiones HTTP al servidor
app.controller('LoginController', function($scope, $window, $http) {
    $scope.usuario = {};
    $scope.mensajeError = "";

    //función que se ejecuta al pulsar el boton de login
    $scope.hacerLogin = function() {
        if ($scope.usuario.user && $scope.usuario.passwd) {
            
            //petición POST al servidor para hacer login POST es enviar get es param pedir información
            $http({
                method: 'POST',
                url: 'http://localhost:3000/login',
                data: { 
                    user: $scope.usuario.user, 
                    passwd: $scope.usuario.passwd 
                }
            }).then(function(response) {
                //si el login es correcto, guardamos el token y el nombre de usuario en sessionStorage
                $window.sessionStorage.setItem('token', response.data.session_id);
                $window.sessionStorage.setItem('username', response.data.name);
                
                //redireccionamos a la página correspondiente según el rol del usuario
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
