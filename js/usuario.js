//Crear la aplicación AngularJS
const app = angular.module('usuarioApp', []);
//Crear el controlador para la gestión del catálogo de vídeos
app.controller('UsuarioController', function($scope, $window, $http) {
    const token = $window.sessionStorage.getItem('token');
    
    if (!token) {
        $window.location.href = 'index.html';
        return;
    }
    
    $scope.usuarioActual = $window.sessionStorage.getItem('username');
    $scope.categorias = [];
    $scope.videos = [];

    //Función para cargar el catálogo de categorías y vídeos desde el servidor
    $scope.cargarCatalogo = function() {
        //Petición GET para obtener la lista de categorías
        $http.get('http://localhost:3000/categorias/' + token).then(function(res) {
            //Si la petición es exitosa, asignar los datos a $scope.categorias
            $scope.categorias = res.data;
        }, function() {
            alert("Tu sesión ha caducado. Vuelve a iniciar sesión.");
            $scope.logout();
        });

        $http.get('http://localhost:3000/videos/' + token).then(function(res) {
            $scope.videos = res.data;
        });
    };

    $scope.cargarCatalogo();

    $scope.obtenerMiniatura = function(url) {
        if (!url) return '';
        
        // Expresión regular para encontrar el ID del vídeo de YouTube
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);

        if (match && match[2].length === 11) {
            // Si es un vídeo de YouTube, devolvemos su miniatura 
            return 'https://img.youtube.com/vi/' + match[2] + '/hqdefault.jpg';
        } else {
            // Si no es un enlace de YouTube, devolvemos un fondo gris por defecto
            return 'https://via.placeholder.com/640x360/475569/FFFFFF?text=Video';
        }
    };

    $scope.logout = function() {
        $http.put('http://localhost:3000/logout', { session_id: token })
        .finally(function() {
            $window.sessionStorage.clear();
            $window.location.href = 'index.html';
        });
    };
});
