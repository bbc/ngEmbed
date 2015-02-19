function BaseServiceProvider($http) {
    'use strict';

    function BaseService() {
        this.$http = $http;
    }
    BaseService.prototype.getEmbed = function() {};

    return BaseService;
}

app.service('baseService', ['$http', BaseServiceProvider]);