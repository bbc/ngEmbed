
function BaseServiceProvider($http) {

    function BaseService() {
        this.$http = $http;
    }
    BaseService.prototype.getEmbed = function() {};

    return BaseService;
}

app.service('baseService', ['$http', BaseServiceProvider]);