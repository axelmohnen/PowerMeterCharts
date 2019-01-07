sap.ui.define([
	"sap/m/TimePicker",
	"sap/m/TimePickerRenderer",
	"jquery.sap.global",
	"sap/m/InputBase",
	"sap/m/MaskInput",
	"sap/m/MaskInputRule",
	"sap/m/ResponsivePopover",
	"sap/ui/core/EnabledPropagator",
	"sap/ui/core/IconPool",
	"sap/ui/model/type/Time",
	"sap/m/TimePickerSliders",
	"PowerMeterCharts/PowerMeterCharts/controls/ValuePickerSliders"
], function(TimePicker, TimePickerRenderer, jQuery, InputBase, MaskInput, MaskInputRule, ResponsivePopover, EnabledPropagator, IconPool,
	TimeModel, TimePickerSliders, ValuePickerSliders) {
	"use strict";
	return TimePicker.extend("PowerMeterCharts.PowerMeterCharts.controls.ValuePicker", {

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
			TimePicker.prototype.init.apply(this, arguments);
			this.setDisplayFormat("vp");
		},

		setFromStep: function(iFromStep) {
			var sOutputValue;
			this.setProperty("fromStep", iFromStep, true);
			sOutputValue = iFromStep;

			// do not call InputBase.setValue because the displayed value and the output value might have different pattern
			if (this.isActive()) {
				this._synchronizeInput(sOutputValue);
			}

			return this;
		},

		setToStep: function(iToStep) {
			var sOutputValue;
			this.setProperty("toStep", iToStep, true);
			sOutputValue = iToStep;

			// do not call InputBase.setValue because the displayed value and the output value might have different pattern
			if (this.isActive()) {
				this._synchronizeInput(sOutputValue);
			}

			return this;
		},

		setPickerTitle: function(sPickerTitle) {
			var sOutputValue;
			this.setProperty("pickerTitle", sPickerTitle, true);
			sOutputValue = sPickerTitle;

			// do not call InputBase.setValue because the displayed value and the output value might have different pattern
			if (this.isActive()) {
				this._synchronizeInput(sOutputValue);
			}

			return this;
		},

		_createPicker: function(sFormat) {
			var that = this,
				oPopover,
				oPicker,
				oResourceBundle,
				sOKButtonText,
				sCancelButtonText,
				sTitle;

			oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.m");
			sOKButtonText = oResourceBundle.getText("TIMEPICKER_SET");
			sCancelButtonText = oResourceBundle.getText("TIMEPICKER_CANCEL");
			sTitle = this.getTitle();

			oPicker = new ResponsivePopover(that.getId() + "-RP", {
				showCloseButton: false,
				showHeader: false,
				horizontalScrolling: false,
				verticalScrolling: false,
				placement: sap.m.PlacementType.VerticalPreferedBottom,
				beginButton: new sap.m.Button({
					text: sOKButtonText,
					press: jQuery.proxy(this._handleOkPress, this)
				}),
				endButton: new sap.m.Button({
					text: sCancelButtonText,
					press: jQuery.proxy(this._handleCancelPress, this)
				}),
				content: [
					new ValuePickerSliders(this.getId() + "-sliders", {
						format: sFormat,
						labelText: sTitle ? sTitle : "",
						invokedBy: that.getId(),
						fromStep: this.getFromStep(),
						toStep: this.getToStep(),
						pickerTitle: this.getPickerTitle()
					})
				],
				contentHeight: TimePicker._PICKER_CONTENT_HEIGHT
			});

			oPopover = oPicker.getAggregation("_popup");
			// hide arrow in case of popover as dialog does not have an arrow
			if (oPopover.setShowArrow) {
				oPopover.setShowArrow(false);
			}

			oPopover.oPopup.setAutoCloseAreas([this.getDomRef("icon")]);

			oPicker.addStyleClass(this.getRenderer().CSS_CLASS + "DropDown")
				.attachBeforeOpen(this.onBeforeOpen, this)
				.attachAfterOpen(this.onAfterOpen, this)
				.attachAfterClose(this.onAfterClose, this);

			oPicker.open = function() {
				return this.openBy(that);
			};

			if (sap.ui.Device.system.desktop) {
				this._oPopoverKeydownEventDelegate = {
					onkeydown: function(oEvent) {
						var oKC = jQuery.sap.KeyCodes,
							iKC = oEvent.which || oEvent.keyCode,
							bAlt = oEvent.altKey;

						// Popover should be closed when ESCAPE key or ATL+F4 is pressed
						if ((bAlt && (iKC === oKC.ARROW_UP || iKC === oKC.ARROW_DOWN)) || iKC === oKC.F4) {
							this._handleOkPress(oEvent);
							//focus the input
							this.focus();
							oEvent.preventDefault();
						}
					}
				};

				oPopover.addEventDelegate(this._oPopoverKeydownEventDelegate, this);
				//override popover callback - the best place to update content layout
				oPopover._afterAdjustPositionAndArrowHook = function() {
					that._getSliders()._onOrientationChanged();
				};
			}

			// define a parent-child relationship between the control's and the _picker pop-up
			this.setAggregation("_picker", oPicker, true);

			return oPicker;
		},

		setValueFormat: function(sValueFormat) {
			var sValue = this.getValue();
			this.setProperty("value", sValue, true); // no rerendering
			this._sLastChangeValue = sValue;
		},

		setDisplayFormat: function(sDisplayFormat) {
			var sOutputValue,
				oDateValue;

			// if displayFormat changes the value must be formatted again
			this.setProperty("displayFormat", sDisplayFormat, true); // no rerendering

			this._initMask();

			oDateValue = this.getDateValue();

			if (!oDateValue) {
				return this;
			}

			sOutputValue = this._formatValue(oDateValue);

			if (this.isActive()) {
				this._synchronizeInput(sOutputValue);
			}

			return this;
		},

		_handleOkPress: function() {
			var sValue = this._getSliders().getVpValues();

			this.updateDomValue(sValue);
			this._handleInputChange();

			this._closePicker();
		},

		_handleInputChange: function(sValue) {

			sValue = sValue || this._$input.val();

			this._bValid = true;

			if (this.isActive() && (this._$input.val() !== sValue)) {
				this.updateDomValue(sValue);
				if (this.bShowLabelAsPlaceholder) {
					// because value property might not be updated between typing
					this.$("placeholder").css("display", sValue ? "none" : "inline");
				}
			}

			this.setProperty("value", sValue, true); // no rerendering

			this.fireChangeEvent(sValue, {
				valid: this._bValid
			});

			return true;
		},

		setValue: function(sValue) {
			var sOutputValue;

			sValue = this.validateProperty('value', sValue);

			this._initMask();

			MaskInput.prototype.setValue.call(this, sValue);
			this._sLastChangeValue = sValue;
			this._bValid = true;

			sOutputValue = sValue;

			// do not call InputBase.setValue because the displayed value and the output value might have different pattern
			if (this.isActive()) {
				this._synchronizeInput(sOutputValue);
			}

			return this;
		},

		_formatValue: function(oDate, bValueFormat) {
			var sValue = "";

			sValue = this.getValue();
			return sValue;
		},

		onfocusin: function(oEvent) {
			var oPicker = this._getPicker();
			var bIconClicked = jQuery(oEvent.target).hasClass("sapUiIcon");

			if (oPicker && oPicker.isOpen() && !bIconClicked) {
				this._closePicker();
			}
		},

		onfocusout: function(o) {
			var p = this._getPicker();
			//M.prototype.onfocusout.apply(this, arguments);
			if (p && !p.isOpen() && !this._bPickerOpening) {
				this.$().removeClass('sapMTPInputActive');
			}
		},

		renderer: TimePickerRenderer
	});
});