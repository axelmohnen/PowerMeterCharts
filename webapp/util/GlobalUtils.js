// Global Utilities
sap.ui.define([], function() {
	"use strict";
	return {
		compareDeviceSeq: function(a, b) {
			if (a.DeviceSeq < b.DeviceSeq)
				return -1;
			if (a.DeviceSeq > b.DeviceSeq)
				return 1;
			return 0;
		},

		compareMonth: function(sMonthA, sMonthB) {
			if (sMonthA < sMonthB)
				return -1;
			if (sMonthA > sMonthB)
				return 1;
			return 0;
		},

		compareTimestamp: function(a, b) {
			if (a.TIMESTAMP < b.TIMESTAMP)
				return -1;
			if (a.TIMESTAMP > b.TIMESTAMP)
				return 1;
			return 0;
		},

		checkServiceURL: function(sThis) {
			var oModel = sThis.getModel("FhemService");
			return oModel.sServiceUrl.indexOf("192.168.999.999") !== -1;
		},

		setColorPalette4RadThermo: function(sTemp) {
			// Set Color Palette
			if (sTemp >= 25) {
				return "#f20707"; //Red
			} else if (sTemp >= 20) {
				return "#f29007"; //Orange
			} else {
				return "#5cbae6"; //Blue	
			}
		},

		setFraction4RadThermo: function(sReqTemp) {
			//Set Faction
			if (sReqTemp === "on") {
				return 30;
			} else if (sReqTemp === "off") {
				return 0;
			} else {
				return parseFloat(sReqTemp);
			}
		},

		convertTimestamp: function(sTimestamp) {
			//Expected Timestamp format "2016-12-28 00:00:00"

			// Check import parameter 
			if (!sTimestamp) {
				return;
			}

			// Build returning object (can be extended in case other formats are required)
			var oResult = {
				monthYear: ""
			};

			// Build month/year format (MM.YYYY)
			oResult.monthYear = sTimestamp.substr(5, 2) + "." + sTimestamp.substr(0, 4);
			
			// Timestamp with first day of month (YYYY-MM-01 00:00:00)
			var sTimestampFirstDayMonth = sTimestamp;
			oResult.timestampFirstDayMonth = sTimestampFirstDayMonth.replace( sTimestampFirstDayMonth.substr(8, 2), "01");
			return oResult;
		},

		getMonthName: function(iMonthId) {
			// Build List of Month names
			var aMonthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
				"Juli", "August", "September", "Oktober", "November", "Dezember"
			];

			// Return month name for given ID 
			return aMonthNames[iMonthId];
		},

		addLeadingZeros: function(iNumber, iSize) {
			var s = iNumber + "";
			while (s.length < iSize) {
				s = "0" + s;
			}
			return s;
		},
		
		convertDate2Period: function(oDate) {
			//Build period format from Date (MM.YYYY)
			var sPeriod = ("0" + (oDate.getMonth() + 1)).slice(-2) + "." + oDate.getFullYear();
			return sPeriod;
		},
		
		convertDateTime2DateTimeString: function(sDate, sTime) {
			//Build DateTimeString (YYYY-MM-dd 00:00:00) from Date (YYY-MM-dd) and Time (00:00:00)
			var sDateTimeString = sDate + " " + sTime;
			return sDateTimeString;
		},
		
		convertDateToISOStringCET: function(oDate){
			//Convert date into ISO Timestamp string converted to CET Timezone UTC+2
			var iTimezoneOffset = oDate.getTimezoneOffset() * 60000; //CET = UTC+2
			return new Date(oDate.getTime() - (iTimezoneOffset)).toISOString();
		}

	};
});