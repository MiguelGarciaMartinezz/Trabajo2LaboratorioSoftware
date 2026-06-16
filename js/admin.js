//Crear la aplicación AngularJS
const app = angular.module('adminApp', []);

//Crear el controlador para la gestión de usuarios, categorías y vídeos
app.controller('AdminController', function($scope, $window, $http) {
    const token = $window.sessionStorage.getItem('token');
    
    //Si no hay token, redirigir al login
    if (!token) {
        $window.location.href = 'index.html';
        return;
    }
    
    //Obtener el nombre del usuario actual desde sessionStorage
    $scope.usuarioActual = $window.sessionStorage.getItem('username');

    $scope.usuarios = [];
    $scope.categorias = [];
    $scope.videos = [];

    //Función para cargar los datos de usuarios, categorías y vídeos desde el servidor
    $scope.cargarDatos = function() {
        //Petición GET para obtener la lista de usuarios
        $http.get('http://localhost:3000/users/' + token).then(function(res) {
            //Si la petición es exitosa, asignar los datos a $scope.usuarios
            $scope.usuarios = res.data;
        }, function() {
            alert("Tu sesión ha caducado. Vuelve a iniciar sesión.");
            $scope.logout();
        });
        //Petición GET para obtener la lista de categorías
        $http.get('http://localhost:3000/categorias/' + token).then(function(res) {
            $scope.categorias = res.data;
        });
        //Petición GET para obtener la lista de vídeos
        $http.get('http://localhost:3000/videos/' + token).then(function(res) {
            $scope.videos = res.data;
        });
    };

    $scope.cargarDatos();

    $scope.nuevoUser = {};
    $scope.crearUsuario = function() {
        $http.post('http://localhost:3000/user', {
            session_id: token,
            name: $scope.nuevoUser.name,
            email: $scope.nuevoUser.email,
            passwd: $scope.nuevoUser.passwd
            // Enviar los datos del nuevo usuario al servidor
        }).then(function(res) {
            $scope.usuarios.push(res.data);
            $scope.nuevoUser = {};
        }, function(error) {
            alert("Error: " + (error.data.error || "Fallo al crear"));
        });
    };

    // Función para editar un usuario existente
    $scope.editarUsuario = function(u) {
        // Pedir al administrador que introduzca los nuevos datos del usuario mediante prompts
        const nuevoNombre = prompt("Nuevo nombre:", u.name);
        const nuevoEmail = prompt("Nuevo email:", u.email);
        const nuevaClave = prompt("Nueva contraseña (o deja la actual):", u.passwd || "");
        
        if (nuevoNombre && nuevoEmail) {
            $http.put('http://localhost:3000/user/' + token + '/' + u.id, {
                name: nuevoNombre, email: nuevoEmail, passwd: nuevaClave
            }).then(function() {
                // Si la actualización es exitosa, recargar los datos para reflejar los cambios
                $scope.cargarDatos();
            }, function(err) {
                alert("Error al actualizar usuario");
            });
        }
    };
    
    // Función para borrar un usuario existente
    $scope.borrarUsuario = function(idUser, index) {
        if(confirm("¿Estás seguro de borrar a este usuario?")) {
            $http.delete('http://localhost:3000/user/' + token + '/' + idUser)
            //Si la petición DELETE es exitosa, eliminar el usuario de la lista local
            .then(function() {
                $scope.usuarios.splice(index, 1);
            }, function(error) {
                alert("Error: " + (error.data.error || "Fallo al borrar"));
            });
        }
    };

    //crear una nueva categoría
    $scope.nuevaCatNombre = "";
    $scope.crearCategoria = function() {
        $http.post('http://localhost:3000/categoria', {
            session_id: token,
            nombre: $scope.nuevaCatNombre
            // Enviar el nombre de la nueva categoría al servidor
        }).then(function(res) {
            $scope.categorias.push(res.data);
            $scope.nuevaCatNombre = '';
        }, function(error) {
            alert("Error: " + (error.data.error || "La categoría ya existe"));
        });
    };

    // Función para editar una categoría existente
    $scope.editarCategoria = function(cat) {
        const nuevoNombre = prompt("Nuevo nombre para la categoría:", cat.nombre);
        if (nuevoNombre && nuevoNombre !== cat.nombre) {
            $http.put('http://localhost:3000/categoria/' + token + '/' + cat.id, {
                nombre: nuevoNombre
                // Enviar el nuevo nombre de la categoría al servidor
            }).then(function() {
                $scope.cargarDatos();
            }, function(err) {
                alert("Error al actualizar categoría");
            });
        }
    };
    
    // Función para borrar una categoría existente
    $scope.borrarCategoria = function(nombreCat, index) {
        if(confirm("Si borras la categoría, se borrarán sus vídeos. ¿Continuar?")) {
            $http.delete('http://localhost:3000/categoria/' + token + '/' + nombreCat)
            //Si la petición DELETE es exitosa, eliminar la categoría de la lista local y recargar los datos
            .then(function() {
                $scope.categorias.splice(index, 1);
                $scope.cargarDatos(); 
            });
        }
    };

    // Función para crear un nuevo vídeo
    $scope.nuevoVideo = {};
    $scope.crearVideo = function() {
        $http.post('http://localhost:3000/video', {
            session_id: token,
            titulo: $scope.nuevoVideo.titulo,
            url: $scope.nuevoVideo.url,
            categoria_nombre: $scope.nuevoVideo.categoria
            // Enviar los datos del nuevo vídeo al servidor
        }).then(function(res) {
            $scope.videos.push(res.data);
            $scope.nuevoVideo = {};
        });
    };

    // Función para editar un vídeo existente
    $scope.editarVideo = function(vid) {
        const nuevoTitulo = prompt("Nuevo título:", vid.titulo);
        const nuevaUrl = prompt("Nueva URL:", vid.url);
        
        // Si el administrador proporciona un nuevo título y URL, enviar la actualización al servidor
        if (nuevoTitulo && nuevaUrl) {
            $http.put('http://localhost:3000/video/' + token + '/' + vid.id, {
                titulo: nuevoTitulo, url: nuevaUrl, categoria_nombre: vid.categoria_nombre
            }).then(function() {
                $scope.cargarDatos();
            }, function(err) {
                alert("Error al actualizar vídeo");
            });
        }
    };
    
    // Función para borrar un vídeo existente
    $scope.borrarVideo = function(idVideo, index) {
        if(confirm("¿Borrar este vídeo?")) {
            $http.delete('http://localhost:3000/video/' + token + '/' + idVideo)
            .then(function() {
                $scope.videos.splice(index, 1);
                // Recargar los datos para reflejar los cambios
            });
        }
    };

    // Función para cerrar sesión y limpiar sessionStorage
    $scope.logout = function() {
        $http.put('http://localhost:3000/logout', { session_id: token })
        .finally(function() {
            $window.sessionStorage.clear();
            $window.location.href = 'index.html';
        });
    };
});
