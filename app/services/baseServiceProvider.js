

function ProviderService($http) {
    this.$http = $http;
}
ProviderService.prototype.getEmbed = function() {};



app.service('providerService', ['$http', ProviderService]);