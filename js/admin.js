const app = angular.module('adminApp', []);

app.controller('AdminController', function($scope, $window, $http) {
    const token = $window.sessionStorage.getItem('token');
    
    if (!token) {
        $window.location.href = 'index.html';
        return;
    }
    
    $scope.usuarioActual = $window.sessionStorage.getItem('username');

    $scope.usuarios = [];
    $scope.categorias = [];
    $scope.videos = [];

    // ==========================================
    // CARGA INICIAL DE DATOS
    // ==========================================
    $scope.cargarDatos = function() {
        $http.get('http://localhost:3000/users/' + token).then(function(res) {
            $scope.usuarios = res.data;
        }, function() {
            alert("Tu sesión ha caducado. Vuelve a iniciar sesión.");
            $scope.logout();
        });

        $http.get('http://localhost:3000/categorias/' + token).then(function(res) {
            $scope.categorias = res.data;
        });

        $http.get('http://localhost:3000/videos/' + token).then(function(res) {
            $scope.videos = res.data;
        });
    };

    $scope.cargarDatos();

    // ==========================================
    // USUARIOS
    // ==========================================
    $scope.nuevoUser = {};
    $scope.crearUsuario = function() {
        $http.post('http://localhost:3000/user', {
            session_id: token,
            name: $scope.nuevoUser.name,
            email: $scope.nuevoUser.email,
            passwd: $scope.nuevoUser.passwd
        }).then(function(res) {
            $scope.usuarios.push(res.data);
            $scope.nuevoUser = {};
        }, function(error) {
            alert("Error: " + (error.data.error || "Fallo al crear"));
        });
    };
    
    $scope.borrarUsuario = function(idUser, index) {
        if(confirm("¿Estás seguro de borrar a este usuario?")) {
            $http.delete('http://localhost:3000/user/' + token + '/' + idUser)
            .then(function() {
                $scope.usuarios.splice(index, 1);
            }, function(error) {
                alert("Error: " + (error.data.error || "Fallo al borrar"));
            });
        }
    };

    // ==========================================
    // CATEGORÍAS
    // ==========================================
    $scope.nuevaCatNombre = "";
    $scope.crearCategoria = function() {
        $http.post('http://localhost:3000/categoria', {
            session_id: token,
            nombre: $scope.nuevaCatNombre
        }).then(function(res) {
            $scope.categorias.push(res.data);
            $scope.nuevaCatNombre = '';
        }, function(error) {
            alert("Error: " + (error.data.error || "La categoría ya existe"));
        });
    };
    
    $scope.borrarCategoria = function(nombreCat, index) {
        if(confirm("Si borras la categoría, se borrarán sus vídeos. ¿Continuar?")) {
            $http.delete('http://localhost:3000/categoria/' + token + '/' + nombreCat)
            .then(function() {
                $scope.categorias.splice(index, 1);
                $scope.cargarDatos(); 
            });
        }
    };

    // ==========================================
    // VÍDEOS
    // ==========================================
    $scope.nuevoVideo = {};
    $scope.crearVideo = function() {
        $http.post('http://localhost:3000/video', {
            session_id: token,
            titulo: $scope.nuevoVideo.titulo,
            url: $scope.nuevoVideo.url,
            categoria_nombre: $scope.nuevoVideo.categoria
        }).then(function(res) {
            $scope.videos.push(res.data);
            $scope.nuevoVideo = {};
        });
    };
    
    $scope.borrarVideo = function(idVideo, index) {
        if(confirm("¿Borrar este vídeo?")) {
            $http.delete('http://localhost:3000/video/' + token + '/' + idVideo)
            .then(function() {
                $scope.videos.splice(index, 1);
            });
        }
    };

    // ==========================================
    // LOGOUT
    // ==========================================
    $scope.logout = function() {
        $http.put('http://localhost:3000/logout', { session_id: token })
        .finally(function() {
            $window.sessionStorage.clear();
            $window.location.href = 'index.html';
        });
    };
});