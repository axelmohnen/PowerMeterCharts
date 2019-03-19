sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/Control",
	"sap/m/TimePickerSliders",
	"sap/m/TimePickerSlidersRenderer",
	"sap/m/TimePickerSlider"
], function(jQuery, Control, TimePickerSliders, TimePickerSlidersRenderer, TimePickerSlider) {
	"use strict";
	return TimePickerSliders.extend("PowerMeterCharts.PowerMeterCharts/controls/ValuePickerSliders", {
		metadata: {

			properties: {
				fromStep: {
					type: "int",
					group: "Misc",
					defaultValue: 1
				},
				toStep: {
					type: "int",
					group: "Misc",
					defaultValue: 1
				},
				pickerTitle: {
					name: "pickerTitle",
					type: "string"
				}
			}
		},

		init: function() {
			// execute standard control method
			TimePickerSliders.prototype.init.apply(this, arguments);
		},

		setFromStep: function(iFromStep) {
			this.setProperty("fromStep", iFromStep, true);
			var aColumns = this.getAggregation("_columns");

			if (aColumns) {
				this.destroyAggregation("_columns");
			}

			this._setupLists(this.getFormat());

			return this;
		},

		setToStep: function(iToStep) {
			this.setProperty("toStep", iToStep, true);
			var aColumns = this.getAggregation("_columns");

			if (aColumns) {
				this.destroyAggregation("_columns");
			}

			//this._setupLists(this.getFormat());
			this._setupLists();

			return this;
		},

		setPickerTitle: function(sPickerTitle) {
			this.setProperty("pickerTitle", sPickerTitle, true);
			var aColumns = this.getAggregation("_columns");

			if (aColumns) {
				this.destroyAggregation("_columns");
			}

			//this._setupLists(this.getFormat());
			this._setupLists();

			return this;
		},

		_setupLists: function(sFormat) {
			var bHoursTrailingZero = false,
				iFrom, iTo,
				bValuePicker = false;

			if (sFormat === undefined) {
				return;
			}

			if (sFormat.indexOf("vp") !== -1) {
				bValuePicker = true;
				iFrom = this.getFromStep();
				iTo = this.getToStep();
			}

			if (bValuePicker) {
				this.addAggregation("_columns", new TimePickerSlider(this.getId() + "-listValuePicker", {
					items: this._generatePickerListValues(iFrom, iTo, 1, bHoursTrailingZero),
					expanded: jQuery.proxy(onSliderExpanded, this),
					label: this.getPickerTitle()
				}));
			}

			this.getAggregation("_columns")[0].setIsExpanded(true);

			/**
			 * Default expanded handler
			 * @param oEvent {jQuery.Event} Event object
			 */
			function onSliderExpanded(oEvent) {
				var aSliders = this.getAggregation("_columns");

				for (var i = 0; i < aSliders.length; i++) {
					if (aSliders[i] !== oEvent.oSource && aSliders[i].getIsExpanded()) {
						aSliders[i].setIsExpanded(false);
					}
				}
			}
		},

		getVpValues: function() {
			var oCore = sap.ui.getCore(),
				oVpValue = oCore.byId(this.getId() + "-listValuePicker"),
				sVpValue = oVpValue.getSelectedValue();

			return sVpValue;
		},

		setVpValues: function(d) {
			var test;

			if (test) {
				test = true;
			}

			// var c = sap.ui.getCore(), l = c.byId(this.getId() + '-listHours'), L = c.byId(this.getId() + '-listMins'), o = c.byId(this.getId() + '-listSecs'), b = c.byId(this.getId() + '-listFormat'), h, A = null;
			// d = d || new Date();
			// h = d.getHours();
			// if (b) {
			//     A = h >= 12 ? 'pm' : 'am';
			//     h = (h > 12) ? h - 12 : h;
			//     h = (h === 0 ? 12 : h);
			// }
			// l && l.setSelectedValue(h.toString());
			// L && L.setSelectedValue(d.getMinutes().toString());
			// o && o.setSelectedValue(d.getSeconds().toString());
			// b && b.setSelectedValue(A);
		},

		onBeforeOpen: function() {
			/* Set the timevalues of the picker here to prevent user from seeing it */
			var oSliders = this._getSliders();

			oSliders.setVpValues(this.getDateValue());
			oSliders.setVpValues("2020");
			oSliders.collapseAll();

			/* Mark input as active */
			this.$().addClass("sapMTPInputActive");
		},

		renderer: TimePickerSlidersRenderer

	});
});