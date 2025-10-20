'use strict';

(function () {
    function verificarAuth() {
        const usuarioLogado = localStorage.getItem('usuarioLogado');
        if (usuarioLogado) {
            window.location.href = 'agendamento';
        } else {
            window.location.href = 'login';
        }
    }

    window.verificarAuth = verificarAuth;
})();
