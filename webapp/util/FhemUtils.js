// FHEM Utilities
sap.ui.define([
		"sap/m/MessageBox"
	],
	function(MessageBox) {
		"use strict";
		return {

			readFhemData: function(oController, sGroupID, sDeviceID, oReadingSet) {
				// Check input
				if (!sGroupID) {
					MessageBox.error("FHEM: Couldn't read data -> GroupID is missing");
					return;
				}
				// Check input
				if (!sDeviceID) {
					MessageBox.error("FHEM: Couldn't read data -> DeviceID is missing");
					return;
				}
				
				var oThis = oController;
				var oModel = oThis.getModel("FhemService");
				//Get config parameters from manifest
				var oConfig = oThis.getOwnerComponent().getManifestEntry("/sap.ui5/config");
				var sPrefix = "?cmd=jsonlist2%20[DeviceID]&XHR=1&fwcsrf=" + oConfig.csrfToken;
				var sPlaceholder = "[DeviceID]";
				var sFhemcmd = oModel.sServiceUrl + sPrefix;
				sFhemcmd = sFhemcmd.replace(sPlaceholder, sDeviceID);

				var oModelFhemData = new sap.ui.model.json.JSONModel();

				// Read FHEM data asynchronous
				oModelFhemData.loadData(sFhemcmd, undefined, true);

				// Handle Request Complete
				oModelFhemData.attachRequestCompleted(function(oData) {

					// Check if we received the data sucessfully
					if (!oModelFhemData.getProperty("/Results/")) {
						return;
					}

					// Map Fhem readings to FHEM Model
					if (oReadingSet instanceof Array) {
						oReadingSet.forEach(function(oValue, i) {
							// Get ReadingsValue from FHEM Model
							var sReadingValue = oModelFhemData.getProperty("/Results/0/Readings/" + oValue.ReadingID + "/Value");
							// Keep old reading value
							oValue.ReadingValueOld = oValue.ReadingValue;
							// Set new reading value
							oValue.ReadingValue = sReadingValue;
							if (!oValue.ReadingValue) {
								oValue.ReadingValue = "0";
							}
						});
					}
					// Build Models
					oThis.buildModels(sGroupID);

				});

				// Error: Service URL is not valid
				oModelFhemData.attachRequestFailed(function(oData) {
					MessageBox.error("Service URL is not valid: " + sFhemcmd);
				});
			},

			readDblogData: function(oController, sDblog, sDevice, sTimeStampFrom, sTimeStampTo, sReading) {

				//Check import parameter
				if (!sDblog) {
					MessageBox.error("FHEM DBLOG: Couldn't read data -> DBLOG is missing");
					return;
				}
				if (!sDevice) {
					MessageBox.error("FHEM DBLOG: Couldn't read data -> Device is missing");
					return;
				}
				if (!sTimeStampFrom) {
					MessageBox.error("FHEM DBLOG: Couldn't read data -> From-Timestamp is missing");
					return;
				}
				if (!sTimeStampTo) {
					MessageBox.error("FHEM DBLOG: Couldn't read data -> To-Timestamp is missing");
					return;
				}
				if (!sReading) {
					MessageBox.error("FHEM DBLOG: Couldn't read data -> Reading is missing");
					return;
				}

				var oModel = oController.getOwnerComponent().getModel("FhemService");
				//Get config parameters from manifest
				var oConfig = oController.getOwnerComponent().getManifestEntry("/sap.ui5/config");
				var sPrefix =
					'?cmd=get%20[Dblog]%20-%20webchart%[TimestampFrom]%20[TimestampTo]%20[Device]%20getTableData%20""%20[Reading]%20""%20""%200%201000&XHR=1&fwcsrf=' + oConfig.csrfToken;
				var sPlaceholderDblog = "[Dblog]";
				var sPlaceholderTimestampFrom = "[TimestampFrom]";
				var sPlaceholderTimestampTo = "[TimestampTo]";
				var sPlaceholderDevice = "[Device]";
				var sPlaceholderReading = "[Reading]";
				var sFhemcmd = oModel.sServiceUrl + sPrefix;
				sFhemcmd = sFhemcmd.replace(sPlaceholderDblog, sDblog);
				sFhemcmd = sFhemcmd.replace(sPlaceholderTimestampFrom, sTimeStampFrom);
				sFhemcmd = sFhemcmd.replace(sPlaceholderTimestampTo, sTimeStampTo);
				sFhemcmd = sFhemcmd.replace(sPlaceholderDevice, sDevice);
				sFhemcmd = sFhemcmd.replace(sPlaceholderReading, sReading);

				// Create Json Model for DBLog data
				var oModelFhemDblogData = new sap.ui.model.json.JSONModel();

				//Example:
				// //"[FHEM Server URL]:8083/fhem?cmd=get%20eg.hw.sz.haushalt.dblog1%20-%20webchart%202016-01-01_00:00:00%202016-12-31_00:00:00%20eg.hw.sz.haushalt.dum1%20getTableData%20""%20Monatsverbrauch%20""%20""%200%201000&XHR=1"
				// Read DBLOG from FHEM synchron
				oModelFhemDblogData.loadData(sFhemcmd, undefined, false);

				if (!oModelFhemDblogData.getProperty("/data")) {
					return;
				} else {
					return oModelFhemDblogData.getProperty("/");
				}

			}
		};
	});