sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"PowerMeterCharts/PowerMeterCharts/util/GlobalUtils",
	"PowerMeterCharts/PowerMeterCharts/util/FhemUtils",
	"sap/ui/model/json/JSONModel"
], function (Controller, History, GlobalUtils, FhemUtils, JSONModel) {
	"use strict";

	return Controller.extend("PowerMeterCharts.PowerMeterCharts.controller.View1", {
		onInit: function () {
			var oDate = new Date();
			var oDateFrom = new Date();

			// Substract current date minus 1 year
			oDateFrom.setFullYear(oDateFrom.getFullYear() - 1);

			// Set current year
			this.iYearCurrent = oDate.getFullYear();

			// Set time frame to read (in years)
			this.iTimeFrame = 5;

			// Build View Model
			var oViewModel = new JSONModel({
				ViewTitle: "",
				DRSChartConsMonthPeriodFrom: new Date(oDateFrom.getFullYear(), oDateFrom.getMonth(), 1),
				DRSChartConsMonthPeriodTo: new Date(oDate.getFullYear(), oDate.getMonth(), 1),
				TabConsMonthYear1: oDateFrom.getFullYear().toString(),
				TabConsMonthYear2: oDate.getFullYear().toString(),
				ChartCurrConsDate: GlobalUtils.convertDateToISOStringCET(oDate).slice(0, 10) //Current date in YYYY-MM-dd
			});
			// Set View Model
			this.getView().setModel(oViewModel, "ViewModel");

			//Set context
			//this._onObjectMatched(this);

			//  Create a JSON Model for consumption per month table view
			var oConsMonthTabModel = new sap.ui.model.json.JSONModel();
			this.getView().setModel(oConsMonthTabModel, "ConsMonthTab");

		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			// // Retrieve key from navigation context 
			// this.sDeviceID = oEvent.getParameter("arguments").DeviceID;
			// this.sReadingID = oEvent.getParameter("arguments").ReadingID;
			// this.sTileHeader = oEvent.getParameter("arguments").TileHeader;
			// this.sTileSubHeader = oEvent.getParameter("arguments").TileSubHeader;

			// // Update Title of view model
			// this.getModel("ViewModel").setProperty("/ViewTitle", this.sTileHeader + this.sTileSubHeader);

			// Get Chart data - Consumption per month
			this.oConsMonthData = this.getConsMonthData(this.sDeviceID);

			// Get Chart data - Current consumption
			this.oCurrConsData = this.getCurrConsData(this.sDeviceID);

			// Build Column Chart for monthly consumption
			this.buildChartConsMonth();

			// Build Table for monthly consumption	
			this.buildTabConsMonth();

			// Build Line Chart for current consumption
			this.buildChartCurrCons();
		},

		onNavBack: function () {
			//  Get VizFrame by ID		
			var oVizFrame = this.getView().byId("ChartConsMonth");
			// Destroy data bindings
			oVizFrame.destroyDataset();
			oVizFrame.destroyFeeds();

			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("object", {
					objectId: "state"
				}, true);
			}
		},

		buildTabConsMonth: function () {
			// Get Table data
			var oTabdata = this.oConsMonthData;
			var iMonth = 0;
			var sKey = "";
			var bDataExists = false;
			var i, j;
			var fTotalConsYear = 0.00;
			var iYear;

			// Check mandatory data 
			if (!oTabdata) {
				return;
			}

			// Get View Model
			var oViewModel = this.getView().getModel("ViewModel");

			//Retrieve comparison years 
			var iYear1 = oViewModel.getProperty("/TabConsMonthYear1");
			var iYear2 = oViewModel.getProperty("/TabConsMonthYear2");

			// Create data container
			var oConsMonthData = {
				"PowerMeter": []
			};

			for (i = 0; i < 12; i++) {
				// Build new data record 
				oConsMonthData.PowerMeter[i] = {
					"Month": GlobalUtils.getMonthName(i)
				};

				for (j = 0; j < 2; j++) {
					// Initialize loop data
					iYear = 0;
					sKey = "";

					// Increment Month
					iMonth = i + 1;

					// Set year to be processed
					switch (j) {
					case 0:
						iYear = iYear1;
						break;
					case 1:
						iYear = iYear2;
						break;
					}

					// Build key to be searched (YYYY-MM-01 00:00:00)
					sKey = iYear + "-" + GlobalUtils.addLeadingZeros(iMonth, 2) + "-" + "01" + " " + "00:00:00";
					// Execute search
					var oResult = jQuery.grep(oTabdata.PowerMeter, function (e) {
						return e.Month === sKey;
					});

					if (oResult.length) {
						//Create new property (Year) and set value
						oConsMonthData.PowerMeter[i][iYear] = oResult[0].Value;
					}

					if (j === 1 && oConsMonthData.PowerMeter[i][iYear1] && oConsMonthData.PowerMeter[i][iYear2]) {
						var iDiffPercentage = ((oConsMonthData.PowerMeter[i][iYear1] / 100) - (oConsMonthData.PowerMeter[i][iYear2] / oConsMonthData.PowerMeter[
							i][iYear1])) * 100;

						oConsMonthData.PowerMeter[i].diff = iDiffPercentage;
					}
				}
			}

			// Set data to model
			var oConsMonthTabModel = this.getView().getModel("ConsMonthTab");
			oConsMonthTabModel.setData(oConsMonthData);

			// Get Table instance 
			var oTabConsMonth = this.getView().byId("TabConsMonth");
			// Remove all existing columns in case of refresh
			oTabConsMonth.removeAllColumns();

			// Build new column handler 
			var oCol = new sap.m.Column({
				header: [
					new sap.m.Label({
						text: "Monat"
					})
				]
			});
			// Set column to table
			oTabConsMonth.addColumn(oCol);

			// Build new Column Item List handler
			var oColList = new sap.m.ColumnListItem();

			// Add new cell to column item list
			oColList.addCell(new sap.m.Text({
				text: "{ConsMonthTab>Month}"
			}));

			for (i = 0; i < 2; i++) {

				// Initialize loop data
				bDataExists = false;
				fTotalConsYear = 0;

				// Set year to be processed
				switch (i) {
				case 0:
					iYear = iYear1;
					break;
				case 1:
					iYear = iYear2;
					break;
				}

				// Check if a data exists for given year
				for (j = 0; j < 12; j++) {
					if (oConsMonthData.PowerMeter[j][iYear]) {
						// Data exists -> set flag and leave loop
						bDataExists = true;

						// Calculate total consumption per year
						fTotalConsYear += parseFloat(oConsMonthData.PowerMeter[j][iYear]);
					}
				}

				// IF no data exists for given -> don't create a column and continue with next year 
				if (!bDataExists) {
					continue;
				}

				// Build new column handler 
				oCol = new sap.m.Column({
					header: [
						new sap.m.Label({
							text: iYear
						})
					],
					footer: [
						new sap.m.Label({
							text: fTotalConsYear
						})
					]
				});
				// Set column to table
				oTabConsMonth.addColumn(oCol);

				// Add new cell to column item list
				oColList.addCell(new sap.m.Text({
					text: "{ConsMonthTab>" + iYear + "}"
				}));
			}

			oTabConsMonth.bindAggregation("items", "ConsMonthTab>/PowerMeter", oColList);

		},

		buildChartConsMonth: function () {

			// Get Chart data
			var oChartdata = this.oConsMonthData;

			// Check mandatory data 
			if (!oChartdata) {
				return;
			}

			//  Get VizFrame by ID		
			var oVizFrame = this.getView().byId("ChartConsMonth");

			//  Create a JSON Model and set the data
			var oChartDataModel = new sap.ui.model.json.JSONModel();
			oChartDataModel.setData(oChartdata);
			oVizFrame.setModel(oChartDataModel);

			// Build Chart DataSet
			var oChartDataSet = this.buildChartConsMonthDataSet();
			// Set dataset
			oVizFrame.setDataset(oChartDataSet);

			// Get View Model
			var oViewModel = this.getView().getModel("ViewModel");
			// Get Period From and Period To 
			var oPeriodFrom = oViewModel.getProperty("/DRSChartConsMonthPeriodFrom");
			var oPeriodTo = oViewModel.getProperty("/DRSChartConsMonthPeriodTo");

			// Set Viz properties
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range(),
					window: {
						start: oPeriodFrom,
						end: oPeriodTo
					}
				},
				dataLabel: {
					visible: true
				},
				valueAxis: {
					title: {
						visible: true,
						text: "Verbrauch in kWh"
					}
				},
				timeAxis: {
					title: {
						visible: true,
						text: "Monat"
					},
					interval: {
						unit: ""
					},
					levels: ["Month", "year"]
				},
				title: {
					visible: false,
					text: this.sTileHeader + this.sTileSubHeader
				}

			});

			// Set Y Axis property
			var feedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
				"uid": "valueAxis",
				"type": "Measure",
				"values": ["Verbrauch in kWh"]
			});

			// Set X Axis property
			var feedTimeAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
				"uid": "timeAxis",
				"type": "Dimension",
				"values": ["Month"]
			});

			// Set Feed data
			oVizFrame.addFeed(feedValueAxis);
			oVizFrame.addFeed(feedTimeAxis);

		},

		buildChartConsMonthDataSet: function () {
			// A Dataset defines how the model data is mapped to the chart
			var oDataSet = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "Month",
					dataType: "date",
					value: "{Month}"
				}],
				measures: [{
					name: "Verbrauch in kWh",
					value: "{Value}"
				}],
				data: {
					path: "/PowerMeter"
				}
			});

			// Leave if we couldn't instanciate the dataset
			if (!oDataSet) {
				return;
			}

			return oDataSet;
		},

		buildChartCurrCons: function () {

			// Get Chart data
			var oChartdata = this.oCurrConsData;

			// Check mandatory data 
			if (!oChartdata) {
				return;
			}

			//  Get VizFrame by ID		
			var oVizFrame = this.getView().byId("ChartCurrCons");
			oVizFrame.destroyDataset();
			oVizFrame.destroyFeeds();

			// Get View Model
			var oViewModel = this.getView().getModel("ViewModel");
			var sCurrConsDate = oViewModel.getProperty("/ChartCurrConsDate");
			var sDateFrom = GlobalUtils.convertDateTime2DateTimeString(sCurrConsDate, "00:00:00");
			var sDateTo = GlobalUtils.convertDateTime2DateTimeString(sCurrConsDate, "23:59:59");

			//  Create a JSON Model and set the data
			var oChartDataModel = new sap.ui.model.json.JSONModel();
			oChartDataModel.setData(oChartdata);
			oVizFrame.setModel(oChartDataModel);

			// Build Chart DataSet
			var oChartDataSet = this.buildChartCurrConsDataSet();
			// Set dataset
			oVizFrame.setDataset(oChartDataSet);

			// Set Viz properties
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range(),
					window: {
						start: sDateFrom,
						end: sDateTo
					}
				},
				dataLabel: {
					visible: true
				},
				valueAxis: {
					title: {
						visible: true,
						text: "Momentanverbrauch in W"
					}
				},
				timeAxis: {
					title: {
						visible: true,
						text: "Uhrzeit"
					},
					interval: {
						unit: ""
					},
					levels: ["Minute", "hour", "day", "year"]
				},
				title: {
					visible: false,
					text: this.sTileHeader + this.sTileSubHeader
				}
			});

			// Set Y Axis property
			var feedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
				"uid": "valueAxis",
				"type": "Measure",
				"values": ["Momentanverbrauch in W"]
			});

			// Set X Axis property
			var feedTimeAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
				//"uid": "categoryAxis",
				"uid": "timeAxis",
				"type": "Dimension",
				"values": ["Uhrzeit"]
			});

			// Set Feed data
			oVizFrame.addFeed(feedValueAxis);
			oVizFrame.addFeed(feedTimeAxis);

		},

		buildChartCurrConsDataSet: function () {
			// A Dataset defines how the model data is mapped to the chart
			var oDataSet = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "Uhrzeit",
					dataType: "date",
					value: "{Uhrzeit}"
				}],
				measures: [{
					name: "Momentanverbrauch in W",
					value: "{Value}"
				}],
				data: {
					path: "/PowerMeter"
				}
			});

			// Leave if we couldn't instanciate the dataset
			if (!oDataSet) {
				return;
			}

			return oDataSet;
		},

		getConsMonthData: function (sDeviceID) {
			var iYearPast = this.iYearCurrent - this.iTimeFrame;
			var sDblog = sDeviceID + ".dblog1";
			var sDevice = sDeviceID + ".dum1";
			var sTimestampFrom = iYearPast + "-01-01_00:00:00";
			var sTimestampTo = this.iYearCurrent + "-12-31_00:00:00";
			var sReading = "Monatsverbrauch";

			//Read DBLOG from FHEM
			var oFhemDblog = FhemUtils.readDblogData(this, sDblog, sDevice, sTimestampFrom, sTimestampTo, sReading);

			// Read Dummy data in case no data has been retrieved from FHEM
			if (!oFhemDblog) {
				oFhemDblog = {
					"data": [{
						"TIMESTAMP": "2015-01-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-03-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-02-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-04-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-05-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "326",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-06-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "324.59",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-07-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "287.41",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-08-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "323.30",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-09-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "318.76",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-10-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "353.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-11-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "367.49",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2015-12-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "369.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-01-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-03-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-02-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-04-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-05-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "326",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-06-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "324.59",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-07-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "287.41",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-08-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "323.30",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-09-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "318.76",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-10-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "353.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-11-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "367.49",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2016-12-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "369.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "444.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-02-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "444.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-03-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "150.99",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-04-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "111.01",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-05-28 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt.dum1",
						"TYPE": "SMLUSB",
						"EVENT": "Monatsverbrauch",
						"READING": "Monatsverbrauch",
						"VALUE": "90.01",
						"UNIT": ""
					}],
					"totalCount": 12
				};

			}

			//Sort Data by Timestamp 
			oFhemDblog.data.sort(GlobalUtils.compareTimestamp);

			var oConsMonthData = {
				"PowerMeter": []
			};

			var iDataLen = oFhemDblog.data.length;
			for (var i = 0; i < iDataLen; i++) {
				// Convert Timestamp into timestamp with first day of month (YYYY-MM-01 00:00:00)
				var oTimestampFormated = GlobalUtils.convertTimestamp(oFhemDblog.data[i].TIMESTAMP);

				// Build new data record 
				oConsMonthData.PowerMeter[i] = {
					"Month": oTimestampFormated.timestampFirstDayMonth,
					"Value": oFhemDblog.data[i].VALUE
				};
			}
			return oConsMonthData;

		},

		getCurrConsData: function (sDeviceID) {
			var iYearPast = this.iYearCurrent - this.iTimeFrame;
			var sDblog = sDeviceID + ".dblog";
			var sDevice = sDeviceID;
			var sTimestampFrom = iYearPast + "-01-01_00:00:00";
			var sTimestampTo = this.iYearCurrent + "-12-31_00:00:00";
			var sReading = "Momentanleistung";

			//Read DBLOG from FHEM
			var oFhemDblog = FhemUtils.readDblogData(this, sDblog, sDevice, sTimestampFrom, sTimestampTo, sReading);

			// Read Dummy data in case no data has been retrieved from FHEM
			if (!oFhemDblog) {
				oFhemDblog = {
					"data": [{

						"TIMESTAMP": "2017-01-01 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 01:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 02:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 03:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 04:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 05:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 06:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 07:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 08:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 09:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 10:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 11:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 12:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 13:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 14:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 15:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 16:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 17:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 18:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 19:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 20:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 21:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 22:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-01 23:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 01:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 02:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 03:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 04:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 05:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 06:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 07:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 08:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 09:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 10:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 11:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 12:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 13:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 14:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 15:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 16:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 17:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 18:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 19:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 20:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 21:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 22:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-02 23:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 00:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 01:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 02:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 03:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 04:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 05:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 06:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 07:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 08:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 09:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 10:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 11:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 12:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 13:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 14:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 15:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 16:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 17:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 18:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 19:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 20:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "317.98",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 21:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "305",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 22:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "278",
						"UNIT": ""
					}, {
						"TIMESTAMP": "2017-01-03 23:00:00",
						"DEVICE": "eg.hw.sz.haushalt",
						"TYPE": "SMLUSB",
						"EVENT": "Momentanverbrauch",
						"READING": "Momentanverbrauch",
						"VALUE": "288",
						"UNIT": ""
					}],
					"totalCount": 72
				};

			}

			//Sort Data by Timestamp 
			oFhemDblog.data.sort(GlobalUtils.compareTimestamp);

			var oCurrConsData = {
				"PowerMeter": []
			};

			var iDataLen = oFhemDblog.data.length;
			for (var i = 0; i < iDataLen; i++) {
				// Convert Timestamp into month/year (MM.YYYY)
				//var oTimestampFormated = GlobalUtils.convertTimestamp(oFhemDblog.data[i].TIMESTAMP);

				// Build new data record 
				oCurrConsData.PowerMeter[i] = {
					"Uhrzeit": oFhemDblog.data[i].TIMESTAMP,
					"Value": oFhemDblog.data[i].VALUE
				};
			}
			return oCurrConsData;

		},

		handleDRSChartConsMonth: function (evt) {
			//  Get VizFrame by ID		
			var oVizFrame = this.getView().byId("ChartConsMonth");
			// Get new Period-From and Period-To values
			var oPeriodFrom = evt.getParameter("from");
			var oPeriodTo = evt.getParameter("to");

			// Set Viz properties
			var properties = oVizFrame.getVizProperties();

			// Set new Period-From and Period-To value
			var sStart = GlobalUtils.convertDateTime2DateTimeString(GlobalUtils.convertDateToISOStringCET(oPeriodFrom).slice(0, 10), "00:00:00");
			var sEnd = GlobalUtils.convertDateTime2DateTimeString(GlobalUtils.convertDateToISOStringCET(oPeriodTo).slice(0, 10), "00:00:00");
			properties.plotArea.window.start = sStart;
			properties.plotArea.window.end = sEnd;

			// Update VIZ Frame properties
			oVizFrame.vizUpdate({
				"properties": properties
			});
		},

		onValuePickerTabConsMonthYear1: function (evt) {
			// Build Table for monthly consumption	
			this.buildTabConsMonth();
		},

		onValuePickerTabConsMonthYear2: function (evt) {
			// Build Table for monthly consumption	
			this.buildTabConsMonth();
		},

		onDPChartCurrCons: function (evt) {
			// Build Line Chart for current consumption
			this.buildChartCurrCons();
		}

	});
});