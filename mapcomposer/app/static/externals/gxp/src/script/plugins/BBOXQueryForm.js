/**
 *  Copyright (C) 2007 - 2012 GeoSolutions S.A.S.
 *  http://www.geo-solutions.it
 *
 *  GPLv3 + Classpath exception
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @requires plugins/QueryForm.js
 * @include widgets/FilterBuilder.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = QueryBBOXForm
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: BBOXQueryForm(config)
 *
 *    Plugin for performing queries on feature layers
 *    TODO Replace this tool with something that is less like GeoEditor and
 *    more like filtering.
 */
gxp.plugins.BBOXQueryForm = Ext.extend(gxp.plugins.QueryForm, {
    
    /** api: ptype = gxp_querybboxform */
    ptype: "gxp_bboxqueryform",
	
	/** api: config[selectionMethodFieldSetComboTitle]
     * ``String``
     * Text for FieldSet Combo Selection Method (i18n).
     */    
    selectionMethodFieldSetComboTitle: "Set Selection Method",
	
	/** api: config[comboSelectionMethodLabel]
     * ``String``
     * Text for Label Combo Selection Method (i18n).
     */    
    comboSelectionMethodLabel: "Selection",

    /** api: config[comboPolygonSelection]
     * ``String``
     * Text for Label Polygon (i18n).
     */        
    comboPolygonSelection: 'Polygon',
    
    /** api: config[comboCircleSelection]
     * ``String``
     * Text for Label Circle (i18n).
     */        
    comboCircleSelection: 'Circle',
    
    /** api: config[comboBBOXSelection]
     * ``String``
     * Text for Label BBOX (i18n).
     */        
    comboBBOXSelection: 'BBOX',
	
	/** api: config[comboBufferSelection]
     * ``String``
     * Text for Label comboBufferSelection (i18n).
     */  
	comboBufferSelection: "Buffer",

    /** api: config[errorDrawPolygonText]
     * ``String``
     * Text for Query Error Draw Polygon (i18n).
     */            
    errorDrawPolygonText: "You have to draw a Polygon",    
    
    /** api: config[errorDrawCircleText]
     * ``String``
     * Text for Query Error Draw Circle (i18n).
     */            
    errorDrawCircleText: "You have to draw a Circle",        

    /** api: config[errorDrawTitle]
     * ``String``
     * Text for Draw Query Error Title (i18n).
     */            
    errorDrawTitle: "Query error",
	
	/** api: config[errorDrawTitle]
     * ``String``
     * Text for BBOx Error Msg (i18n).
     */  
	errorBBOXText: "BBOX invalid",         
	
	/** api: config[errorBufferTitle]
     * ``String``
     * Text for buffer error title.
     */ 
	errorBufferTitle: "Buffer Error",

	/** api: config[errorBufferText]
     * ``String``
     * Text for buffer error text.
     */ 
	errorBufferText: "The selected buffer is invalid!",
	
	useDefinedExtent: false,
    
    init: function(target) {
        
        var me = this;
      
        var confbbox = Ext.apply({
            map: target.mapPanel.map,
            checkboxToggle: false,
            ref: "spatialFieldset",
            title: this.queryByLocationText,
            id: me.id + "_bbox"
        }, this.outputConfig); 
		
        this.bboxFielset = new gxp.form.BBOXFieldset(confbbox);

		this.bufferFieldSet = new gxp.widgets.form.BufferFieldset({
			anchor: '100%',
			ref: "bufferFieldset",
			collapsed : false,
			hidden: true,
			map: target.mapPanel.map,
			toggleGroup: target.toggleGroup,
			minValue: this.outputConfig.bufferOptions.minValue,
            maxValue: this.outputConfig.bufferOptions.maxValue,
		    decimalPrecision: this.outputConfig.bufferOptions.decimalPrecision,
			outputSRS: this.outputConfig.outputSRS,
			selectStyle: this.outputConfig.selectStyle,
			listeners: {
				disable: function(){
					this.hide();
				},
				enable: function(){
					this.show();
				}
			}
		});
		
        this.filterCircle;
        this.filterPolygon;
        this.drawings;
        this.draw;
        
        this.id = this.id ? this.id : new Date().getTime(); 
       
        return gxp.plugins.BBOXQueryForm.superclass.init.apply(this, arguments);
    },
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];
		
		var me = this;
		
        config = Ext.apply({
            border: false,
            bodyStyle: "padding: 10px",
            layout: "form",
            autoScroll: true,
            items: [
            {
                xtype: "fieldset",
                anchor: '100%',
                title : this.selectionMethodFieldSetComboTitle,
                collapsed : false,
                items : [{ 
					xtype: 'combo',
					anchor:'100%',
                    id:'selectionMethod_id',
					ref:'../outputType',
                    fieldLabel: this.comboSelectionMethodLabel,
                    typeAhead: true,
                    triggerAction: 'all',
                    lazyRender:false,
                    mode: 'local',
                    name:'selection_method',
                    forceSelected:true,
                    allowBlank:false,
                    autoLoad:true,
                    displayField: 'label',
                    valueField:'value',
                    value:'bbox',
                    readOnly:false,
                    store: new Ext.data.JsonStore({
                        fields:[
                                {name:'name', dataIndex:'name'},
                                {name:'label', dataIndex:'label'},
                                {name:'value', dataIndex:'value'}
                        ],
                        data:[
                            {name: 'Polygon', label: this.comboPolygonSelection, value: 'polygon'},
                            {name: 'Circle', label: this.comboCircleSelection, value: 'circle'},
							{name: 'Buffer', label: this.comboBufferSelection, value: 'buffer'},
                            {name: 'BBOX', label: this.comboBBOXSelection, value: 'bbox'}
                        ]
                    }), 
                    listeners: {
                        select: function(c,record, index ){
                            me.resetFeatureManager();     
							
                            me.bboxFielset.removeBBOXLayer();
							me.bufferFieldSet.resetPointSelection();
							me.bufferFieldSet.coordinatePicker.toggleButton(false);
							
                            var disabledItems = [];
                            this.target.toolbar.items.each(function(item) {
                                if (!item.disabled) {
                                    disabledItems.push(item);
                                }
                            });
                            
                            for (var i = 0;i<disabledItems.length;i++){
                                if(disabledItems[i].toggleGroup){
                                    if(disabledItems[i].scope && disabledItems[i].scope.actions){
                                        for(var a = 0;a<disabledItems[i].scope.actions.length;a++){
                                            disabledItems[i].scope.actions[a].toggle(false);
                                            
                                            if (disabledItems[i].scope.actions[a].menu){
                                                for(var b = 0;b<disabledItems[i].scope.actions[a].menu.items.items.length;b++){
                                                    disabledItems[i].scope.actions[a].menu.items.items[b].disable();
                                                }
                                            }

                                            disabledItems[i].scope.actions[a].on({
                                                "click": function(evt) {
                                                    var clearButton = this.output[0].getBottomToolbar().items.items[1];
                                                    clearButton.handler.call(clearButton.scope, clearButton, Ext.EventObject);
                                                },
                                                "menushow": function(evt) {
                                                    var menuItems = evt.menu.items.items;
                                                    for (var i = 0;i<menuItems.length;i++){
                                                        menuItems[i].enable();
                                                    }
                                                    var clearButton = this.output[0].getBottomToolbar().items.items[1];
                                                    clearButton.handler.call(clearButton.scope, clearButton, Ext.EventObject);
                                                },
                                                scope: this
                                            });
                                        }
                                    }                    
                                }
                            }
            
                            var outputValue = c.getValue();
                            if (me.draw) {me.draw.deactivate()};
                            if (me.drawings) {me.drawings.destroyFeatures()};
                            if (me.filterCircle) {me.filterCircle = new OpenLayers.Filter.Spatial({})};
                            if (me.filterPolygon) {me.filterPolygon = new OpenLayers.Filter.Spatial({})};
                            
                            if(outputValue == 'circle'){
                                queryForm.spatialFieldset.hide();
                                queryForm.spatialFieldset.disable();
								
								queryForm.bufferFieldset.disable();
                                
                                me.drawings = new OpenLayers.Layer.Vector({},{displayInLayerSwitcher:false});
                                
                                this.target.mapPanel.map.addLayer(me.drawings);
                                var polyOptions = {sides: 100};
                                
                                me.draw = new OpenLayers.Control.DrawFeature(
                                    me.drawings,
                                    OpenLayers.Handler.RegularPolygon,
                                    {
                                        handlerOptions: polyOptions
                                    }
                                );
                                
                                this.target.mapPanel.map.addControl(me.draw);
                                me.draw.activate();

                                me.drawings.events.on({
                                    "featureadded": function(event) {
                                        me.filterCircle = new OpenLayers.Filter.Spatial({
											type: OpenLayers.Filter.Spatial.INTERSECTS,
											property: featureManager.featureStore.geometryName,
											value: event.feature.geometry
										});                                                        
                                    },                                
                                    "beforefeatureadded": function(event) {
                                        me.drawings.destroyFeatures();
                                    }
                                });                                 

                            }else if(outputValue == 'bbox'){                            
                                queryForm.spatialFieldset.show();
                                queryForm.spatialFieldset.enable();
								
                                queryForm.bufferFieldset.disable();
								
                                me.bboxFielset.removeBBOXLayer();
                                me.bboxFielset.setBBOX(me.target.mapPanel.map.getExtent());
                                
                            }else if(outputValue == 'polygon'){                            
                                queryForm.spatialFieldset.hide();
                                queryForm.spatialFieldset.disable();
								
                                queryForm.bufferFieldset.disable();
                                
                                me.drawings = new OpenLayers.Layer.Vector({},{displayInLayerSwitcher:false});
                                this.target.mapPanel.map.addLayer(me.drawings);
                                
                                me.draw = new OpenLayers.Control.DrawFeature(
                                    me.drawings,
                                    OpenLayers.Handler.Polygon
                                );
                                
                                this.target.mapPanel.map.addControl(me.draw);
                                me.draw.activate();

                                me.drawings.events.on({
                                    "featureadded": function(event) {
                                        me.filterPolygon = new OpenLayers.Filter.Spatial({
											type: OpenLayers.Filter.Spatial.INTERSECTS,
											property: featureManager.featureStore.geometryName,
											value: event.feature.geometry
										});
                                    },                                
                                    "beforefeatureadded": function(event) {
                                        me.drawings.destroyFeatures();
                                    }
                                });
                                
                            }else{
							    queryForm.spatialFieldset.hide();
                                queryForm.spatialFieldset.disable();
								
                                queryForm.bufferFieldset.enable();								
                                //me.bufferFieldSet.resetPointSelection();
							}                           
                        },                        
                        scope: this                        
                    }
				}]
            },
			this.bufferFieldSet,     
            this.bboxFielset,
            {
                xtype: "fieldset",
                ref: "attributeFieldset",
                title: this.queryByAttributesText,
                checkboxToggle: true
            }],
            bbar: ["->", {   
                scope: this,    
                text: this.cancelButtonText,
                iconCls: "cancel",
                handler: function() {                
                    this.resetFeatureManager();
					
                    this.bboxFielset.removeBBOXLayer();
                    this.bboxFielset.setBBOX(this.target.mapPanel.map.getExtent());
					
					this.bufferFieldSet.resetPointSelection();
					this.bufferFieldSet.coordinatePicker.toggleButton(false);
					
                    var methodSelection = this.output[0].outputType;
                    methodSelection.setValue('bbox');
					
                    if (me.draw) {me.draw.deactivate()};
                    if (me.drawings) {me.drawings.destroyFeatures()};
                    if (me.filterCircle) {me.filterCircle = new OpenLayers.Filter.Spatial({})};
                    if (me.filterPolygon) {me.filterPolygon = new OpenLayers.Filter.Spatial({})};    
					
                    var ownerCt = this.outputTarget ? queryForm.ownerCt :
                        queryForm.ownerCt.ownerCt;
                    if (ownerCt && ownerCt instanceof Ext.Window) {
                        ownerCt.hide();
                    } else {
                        addFilterBuilder(
                            featureManager, featureManager.layerRecord,
                            featureManager.schema
                        ); 
                    }                    
                }
            }, {
                text: this.queryActionText,
                iconCls: "gxp-icon-find",
                handler: function() {
				    
					me.setExtentBeforeQuery();
					
                    var methodSelection = this.output[0].outputType.getValue();
                    var filters = new Array();
					if(queryForm.spatialFieldset.hidden === false){
						if(this.bboxFielset.isValid()){

							filters.push(new OpenLayers.Filter.Spatial({
								type: OpenLayers.Filter.Spatial.BBOX,
								property: featureManager.featureStore.geometryName,
								value: me.bboxFielset.getBBOXBounds()
							}));
								
							if (queryForm.attributeFieldset.collapsed !== true) {
								var attributeFilter = queryForm.filterBuilder.getFilter();
								attributeFilter && filters.push(attributeFilter);
							}
							featureManager.loadFeatures(filters.length > 1 ?
								new OpenLayers.Filter.Logical({
									type: OpenLayers.Filter.Logical.AND,
									filters: filters
								}) :
								filters[0]
								);                                  
							
						}else{
							Ext.Msg.show({
								title: this.errorDrawTitle,
								msg: this.errorBBOXText,
								buttons: Ext.Msg.OK,
								icon: Ext.MessageBox.INFO
							});
						}
					}else if(queryForm.bufferFieldset.hidden === false){
						if(queryForm.bufferFieldset.isValid()){	

							var radius = queryForm.bufferFieldset.bufferField.getValue(); 

							// create point from your lat and lon of your selected feature
							var coordinates = queryForm.bufferFieldset.coordinatePicker.getCoordinate();
							var radiusPoint = new OpenLayers.Geometry.Point(coordinates[0], coordinates[1]);

							var radiusFilter = new OpenLayers.Filter.Spatial({
								 type: OpenLayers.Filter.Spatial.DWITHIN,
								 value: radiusPoint,
								 distanceUnits: me.outputConfig.bufferOptions.distanceUnits || "m",
								 distance: radius
							});
			 
							filters.push(radiusFilter);
							
							if (queryForm.attributeFieldset.collapsed !== true) {
								var attributeFilter = queryForm.filterBuilder.getFilter();
								attributeFilter && filters.push(attributeFilter);
							}
							
							featureManager.loadFeatures(filters.length > 1 ?
								new OpenLayers.Filter.Logical({
									type: OpenLayers.Filter.Logical.AND,
									filters: filters
								}) :
								filters[0]
								);                                  
							
						}else{
							Ext.Msg.show({
								title: this.errorBufferTitle,
								msg: this.errorBufferText,
								buttons: Ext.Msg.OK,
								icon: Ext.MessageBox.INFO
							});
						}
					}else{
                        if (methodSelection === 'circle'){
                            if(me.filterCircle && me.filterCircle.value ){
                                if (queryForm.attributeFieldset.collapsed !== true) {
                                    var attributeFilter = queryForm.filterBuilder.getFilter();
                                    attributeFilter && filters.push(attributeFilter);
                                }
                                filters.push(me.filterCircle);
                                featureManager.loadFeatures(filters.length > 1 ?
                                    new OpenLayers.Filter.Logical({
                                        type: OpenLayers.Filter.Logical.AND,
                                        filters: filters
                                    }) :
                                    filters[0]
                                    );                                  
                                
                            }else{
                                Ext.Msg.show({
                                    title: this.errorDrawTitle,
                                    msg: this.errorDrawCircleText,
                                    buttons: Ext.Msg.OK,
                                    icon: Ext.MessageBox.INFO
                                });
                            }
                        }else{
                            if(me.filterPolygon && me.filterPolygon.value ){
                                if (queryForm.attributeFieldset.collapsed !== true) {
                                    var attributeFilter = queryForm.filterBuilder.getFilter();
                                    attributeFilter && filters.push(attributeFilter);
                                }
                                filters.push(me.filterPolygon);
                                featureManager.loadFeatures(filters.length > 1 ?
                                    new OpenLayers.Filter.Logical({
                                        type: OpenLayers.Filter.Logical.AND,
                                        filters: filters
                                    }) :
                                    filters[0]
                                    );                                  
                            }else{
                                Ext.Msg.show({
                                    title: this.errorDrawTitle,
                                    msg: this.errorDrawPolygonText,
                                    buttons: Ext.Msg.OK,
                                    icon: Ext.MessageBox.INFO
                                });
                            }
                        }
                    }
                },
                scope: this
            }]
        }, config || {});
		
        var queryForm = gxp.plugins.QueryForm.superclass.addOutput.call(this, config);
        
        var methodSelection = this.output[0].outputType;
        
        var addFilterBuilder = function(mgr, rec, schema) {
            queryForm.attributeFieldset.removeAll();
            queryForm.setDisabled(!schema);
			
            if (schema) {
                queryForm.attributeFieldset.add({
                    xtype: "gxp_filterbuilder",
                    ref: "../filterBuilder",
                    attributes: schema,
                    allowBlank: true,
                    allowGroups: false
                });
				
                queryForm.spatialFieldset.enable();
                queryForm.spatialFieldset.show();
				
				queryForm.bufferFieldset.disable();
				
                queryForm.attributeFieldset.expand();			
				methodSelection.setValue('bbox');
				
				if (me.draw) {me.draw.deactivate()};
				if (me.drawings) {me.drawings.destroyFeatures()};
				if (me.filterCircle) {me.filterCircle = new OpenLayers.Filter.Spatial({})};
				if (me.filterPolygon) {me.filterPolygon = new OpenLayers.Filter.Spatial({})};   
            } else {
                queryForm.attributeFieldset.rendered && queryForm.attributeFieldset.collapse();
                queryForm.spatialFieldset.rendered && queryForm.spatialFieldset.hide();
                methodSelection.setValue('bbox');
				
				if (me.draw) {me.draw.deactivate()};
				if (me.drawings) {me.drawings.destroyFeatures()};
				if (me.filterCircle) {me.filterCircle = new OpenLayers.Filter.Spatial({})};
				if (me.filterPolygon) {me.filterPolygon = new OpenLayers.Filter.Spatial({})};  
            }
			
            queryForm.attributeFieldset.doLayout();
        };
		
        featureManager.on("layerchange", addFilterBuilder);
		
        addFilterBuilder(featureManager,
            featureManager.layerRecord, featureManager.schema
        );
        
        this.target.mapPanel.map.events.register("moveend", this, function() {
            this.bboxFielset.removeBBOXLayer();
            this.bboxFielset.setBBOX(this.target.mapPanel.map.getExtent())
        });
        
        featureManager.on({
            "beforequery": function() {
                new Ext.LoadMask(queryForm.getEl(), {
                    store: featureManager.featureStore,
                    msg: this.queryMsg
                }).show();
            },
            "query": function(tool, store) {
                if (store) {
                    store.getCount() || Ext.Msg.show({
                        title: this.noFeaturesTitle,
                        msg: this.noFeaturesMessage,
                        buttons: Ext.Msg.OK,
                        icon: Ext.Msg.INFO
                    });
                    if (this.autoHide) {
                        var ownerCt = this.outputTarget ? queryForm.ownerCt :
                            queryForm.ownerCt.ownerCt;
                        ownerCt instanceof Ext.Window && ownerCt.hide();
                    }
                }
            },
            scope: this
        });
        
        return queryForm;
    },

	setExtentBeforeQuery: function(){
		var map = this.target.mapPanel.map;
		var layer, extended;
		for (var i=0, len=map.layers.length; i<len; ++i) {
			layer = map.layers[i];
			if (layer.getVisibility()) {
				extended = layer.restrictedExtent || layer.maxExtent;
				extent = extended.clone();
			}
		}
		
		if (extent) {
			// respect map properties
			var restricted = map.restrictedExtent || map.maxExtent;
			if (restricted) {
				extent = new OpenLayers.Bounds(
					Math.max(extent.left, restricted.left),
					Math.max(extent.bottom, restricted.bottom),
					Math.min(extent.right, restricted.right),
					Math.min(extent.top, restricted.top)
				);
			}
			
			var currentExtent = map.getExtent();
			if(!extent.containsBounds(currentExtent)){
				map.zoomToExtent(extent, true);
			}			
		}	
	}
});

Ext.preg(gxp.plugins.BBOXQueryForm.prototype.ptype, gxp.plugins.BBOXQueryForm);
