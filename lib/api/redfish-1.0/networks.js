// Copyright 2016, EMC, Inc.

'use strict';

var injector = require('../../../index.js').injector;
var redfish = injector.get('Http.Api.Services.Redfish');
var waterline = injector.get('Services.Waterline');
var Promise = injector.get('Promise');
var _ = injector.get('_');
var controller = injector.get('Http.Services.Swagger').controller;
var wsman = injector.get('Http.Services.Wsman');
var systems = require('./systems.js');

/**
 * Generate a list of network devices managed by RackHD
 * @param  {Object}     req
 * @param  {Object}     res
 */
var listNetworks = controller(function(req, res) {
    var options = redfish.makeOptions(req, res);
    return waterline.nodes.find({type: 'switch'}).then(function(nodes) {
        options.nodes = nodes;
        return redfish.render('redfish.1.0.0.networkdevicecollection.json',
            'ComputerSystemCollection.json#/definitions/ComputerSystemCollection',
            options);
    }).catch(function(error) {
        return redfish.handleError(error, res);
    });
});

/**
 * Generate information about a specific network device
 * @param  {Object}     req
 * @param  {Object}     res
 */
var getNetwork = controller(function(req, res) {
    var redfishId = redfish.isRedfish(req.swagger.params.identifier.value);
    var identifier = redfishId.identifier;
    var options = redfish.makeOptions(req, res, identifier);
    options.systemType = 'Physical';

    return wsman.isDellSystem(identifier)
        .then(function(result){
            var node = result.node;
            if(result.isDell){
                return Promise.props({
                    hardware: systems.dataFactory(identifier, 'hardware'),
                    boot: systems.dataFactory(identifier, 'boot'),
                    chassis: systems.dataFactory(identifier, 'chassis'),
                    chassisData: systems.dataFactory(identifier, 'chassisData'),
                    obm: Promise.resolve(node)
                        .then(function(node) {
                            return _.map(node.obms, function(val, idx) {
                                return node.id + '.' + idx;
                            });
                        })
                        .then(function(obms) {
                            obms.push('RackHD');
                            return obms;
                        })
                }).then(function(data) {
                    return redfish.render('redfish.2016.3.computersystem.1.3.0.json',
                        'ComputerSystem.v1_3_0.json#/definitions/ComputerSystem',
                        _.merge(options, data));
                }).catch(function(error) {
                    return redfish.handleError(error, res);
                });
            } else if (redfishId.isRedfish) {
                return redfish.getRedfishCatalog(req, res);
            } else {
                return Promise.props({
                    catData: systems.dataFactory(identifier, 'catData'),
                    chassis: systems.dataFactory(identifier, 'chassis'),
                    chassisData: systems.dataFactory(identifier, 'chassisData'),
                    obm: Promise.resolve(node)
                        .then(function(node) {
                            return _.map(node.obms, function(val, idx) {
                                return node.id + '.' + idx;
                            });
                        })
                        .then(function(obms) {
                            obms.push('RackHD');
                            return obms;
                        })
                }).then(function(data) {
                    return redfish.render('redfish.1.0.0.computersystem.1.0.0.json',
                        'ComputerSystem.v1_3_0.json#/definitions/ComputerSystem',
                        _.merge(options, data));
                }).catch(function(error) {
                    return redfish.handleError(error, res);
                });
            }
        }).catch(function(error) {
            return redfish.handleError(error, res);
        });
});


module.exports = {
    listNetworks: listNetworks,
    getNetwork: getNetwork
};