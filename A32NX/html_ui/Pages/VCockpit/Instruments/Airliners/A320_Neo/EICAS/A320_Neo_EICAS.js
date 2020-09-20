class A320_Neo_EICAS extends Airliners.BaseEICAS {
    get templateID() { return "A320_Neo_EICAS"; }
    // This js file has 2 intances at runtime, 1 upper screen and 1 lower
    get isTopScreen() { return this.urlConfig.index === 1; }
    get isBottomScreen() { return this.urlConfig.index === 2; }
    changePage(_pageName) {
        let pageName = _pageName.toUpperCase();
        for (var i = 0; i < this.lowerScreenPages.length; i++) {
            if (this.lowerScreenPages[i].name == pageName) {
                let pageIndex = i;
                if (pageIndex == this.currentPage) {
                    pageName = this.pageNameWhenUnselected;
                    pageIndex = -1;
                }
                this.currentPage = pageIndex;
                SimVar.SetSimVarValue("L:XMLVAR_ECAM_CURRENT_PAGE", "number", pageIndex);
                break;
            }
        }
        this.SwitchToPageName(this.LOWER_SCREEN_GROUP_NAME, pageName);
    }
    createUpperScreenPage() {
        this.upperTopScreen = new Airliners.EICASScreen("TopScreen", "TopScreen", "a320-neo-upper-ecam");
        this.annunciations = new Cabin_Annunciations();
        this.annunciations.offStart = true;
        this.upperTopScreen.addIndependentElement(this.annunciations);
        this.warnings = new Cabin_Warnings();
        this.upperTopScreen.addIndependentElement(this.warnings);
        this.addIndependentElementContainer(this.upperTopScreen);
        this.addIndependentElementContainer(new Airliners.EICASScreen("BottomScreenCommon", "BottomScreen", "eicas-common-display"));
    }
    createLowerScreenPages() {
        this.createLowerScreenPage("ENG", "BottomScreen", "a320-neo-lower-ecam-engine");
        this.createLowerScreenPage("BLEED", "BottomScreen", "a320-neo-lower-ecam-bleed"); // MODIFIED
        this.createLowerScreenPage("PRESS", "BottomScreen", "a320-neo-lower-ecam-press"); // MODIFIED
        this.createLowerScreenPage("ELEC", "BottomScreen", "a320-neo-lower-ecam-elec"); // MODIFIED
        this.createLowerScreenPage("HYD", "BottomScreen", "a320-neo-lower-ecam-hyd"); // MODIFIED
        this.createLowerScreenPage("FUEL", "BottomScreen", "a320-neo-lower-ecam-fuel");
        this.createLowerScreenPage("APU", "BottomScreen", "a320-neo-lower-ecam-apu");
        this.createLowerScreenPage("COND", "BottomScreen", "a320-neo-lower-ecam-cond"); // MODIFIED
        this.createLowerScreenPage("DOOR", "BottomScreen", "a320-neo-lower-ecam-door"); // MODIFIED
        this.createLowerScreenPage("WHEEL", "BottomScreen", "a320-neo-lower-ecam-wheel"); // MODIFIED
        this.createLowerScreenPage("FTCL", "BottomScreen", "a320-neo-lower-ecam-ftcl"); // MODIFIED
        this.createLowerScreenPage("STS", "BottomScreen", "a320-neo-lower-ecam-status"); // MODIFIED
        this.createLowerScreenPage("CRZ", "BottomScreen", "a320-neo-lower-ecam-crz"); // MODIFIED
    }
    getLowerScreenChangeEventNamePrefix() {
        return "ECAM_CHANGE_PAGE_";
    }
    Init() {
        super.Init();
        this.getDeltaTime = A32NX_Util.createDeltaTimeCalculator(this._lastTime);
        this.currentPage = -1;

        this.pageNameWhenUnselected = "DOOR";
        //this prevents switching back to previous pages
        this.minPageIndexWhenUnselected = 0;

        this.ecamFCTLTimer = -1;

        this.changePage("FUEL"); // MODIFIED

        this.lastAPUMasterState = 0; // MODIFIED
        this.ApuAboveThresholdTimer = -1; // MODIFIED
        this.MainEngineStarterOffTimer = -1;
        this.CrzCondTimer = 60;

        this.topSelfTestDiv = this.querySelector("#TopSelfTest");
        this.topSelfTestTimer = -1;
        this.topSelfTestTimerStarted = false;
        this.topSelfTestLastKnobValue = 1;

        this.bottomSelfTestDiv = this.querySelector("#BottomSelfTest");
        this.bottomSelfTestTimer = -1;
        this.bottomSelfTestTimerStarted = false;
        this.bottomSelfTestLastKnobValue = 1;

        // Using ternary in case the LVar is undefined
        this.ACPowerLastState = SimVar.GetSimVarValue("L:A32NX_COLD_AND_DARK_SPAWN", "Bool") ? 0 : 1;

        this.electricity = this.querySelector("#Electricity");
        this.changePage("DOOR"); // MODIFIED
        this.changePage("DOOR"); // This should get the ECAM into the "unselected" state

        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:7","FLOAT64",0);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:14","FLOAT64",0);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:15","FLOAT64",0);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:16","FLOAT64",0);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:17","FLOAT64",0.1);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:18","FLOAT64",0.1);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:19","FLOAT64",0.1);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:20","FLOAT64",0.1);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:21","FLOAT64",0.1);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:22","FLOAT64",0.1);
        SimVar.SetSimVarValue("LIGHT POTENTIOMETER:23","FLOAT64",0.1);
    }
    onUpdate() {
        const _deltaTime = this.getDeltaTime();

        super.onUpdate(_deltaTime);
        this.updateAnnunciations();
        this.updateScreenState();

        const engineOn = Simplane.getEngineActive(0) || Simplane.getEngineActive(1);
        const externalPowerOn = SimVar.GetSimVarValue("EXTERNAL POWER AVAILABLE:1", "Bool") === 1 && SimVar.GetSimVarValue("EXTERNAL POWER ON", "Bool") === 1;
        const apuOn = SimVar.GetSimVarValue("L:APU_GEN_ONLINE", "bool");
        const isACPowerAvailable = engineOn || apuOn || externalPowerOn;
        var DCBus = false;

        const ACPowerStateChange = (isACPowerAvailable != this.ACPowerLastState);
        SimVar.SetSimVarValue("L:ACPowerStateChange","Bool",ACPowerStateChange);

        if(SimVar.GetSimVarValue("ELECTRICAL MAIN BUS VOLTAGE","Volts")>=20){
            DCBus = true;
        }
        var isDCPowerAvailable = isACPowerAvailable || DCBus;
        if(isDCPowerAvailable){
            SimVar.SetSimVarValue("L:DCPowerAvailable","bool",1);   //True if any AC|DC bus is online
        }
        else{
            SimVar.SetSimVarValue("L:DCPowerAvailable","bool",0);
        }
        if(isACPowerAvailable){
            SimVar.SetSimVarValue("L:ACPowerAvailable","bool",1);   //True if any AC bus is online
        }
        else{
            SimVar.SetSimVarValue("L:ACPowerAvailable","bool",0);
        }

        /**
         * Self test on top ECAM screen
         **/

        let topSelfTestCurrentKnobValue = SimVar.GetSimVarValue("LIGHT POTENTIOMETER:22", "number");

        if(((topSelfTestCurrentKnobValue >= 0.1 && this.topSelfTestLastKnobValue < 0.1) || ACPowerStateChange) && isACPowerAvailable && !this.topSelfTestTimerStarted) {
            this.topSelfTestDiv.style.display = "block";
            this.topSelfTestTimer = 14.25;
            this.topSelfTestTimerStarted = true;
        }

        if (this.topSelfTestTimer >= 0) {
            this.topSelfTestTimer -= _deltaTime / 1000;
            if (this.topSelfTestTimer <= 0) {
                this.topSelfTestDiv.style.display = "none";
                this.topSelfTestTimerStarted = false;
            }
        }

        this.topSelfTestLastKnobValue = topSelfTestCurrentKnobValue;

        /**
         * Self test on bottom ECAM screen
         **/

        let bottomSelfTestCurrentKnobValue = SimVar.GetSimVarValue("LIGHT POTENTIOMETER:23", "number");

        if(((bottomSelfTestCurrentKnobValue >= 0.1 && this.bottomSelfTestLastKnobValue < 0.1) || ACPowerStateChange) && isACPowerAvailable && !this.bottomSelfTestTimerStarted) {
            this.bottomSelfTestDiv.style.display = "block";
            this.bottomSelfTestTimer = 14.25;
            this.bottomSelfTestTimerStarted = true;
        }

        if (this.bottomSelfTestTimer >= 0) {
            this.bottomSelfTestTimer -= _deltaTime / 1000;
            if (this.bottomSelfTestTimer <= 0) {
                this.bottomSelfTestDiv.style.display = "none";
                this.bottomSelfTestTimerStarted = false;
            }
        }

        this.bottomSelfTestLastKnobValue = bottomSelfTestCurrentKnobValue;

        this.ACPowerLastState = isACPowerAvailable;

        // modification start here
        var currentAPUMasterState = SimVar.GetSimVarValue("FUELSYSTEM VALVE SWITCH:8", "Bool");


        //Determine displayed page when no button is selected
        const prevPage = this.pageNameWhenUnselected;

        const altitude = Simplane.getAltitude();
        const isGearExtended = SimVar.GetSimVarValue("GEAR HANDLE POSITION", "Bool");
        const currFlightPhase = SimVar.GetSimVarValue("L:AIRLINER_FLIGHT_PHASE", "number");
        const leftThrottleDetent = Simplane.getEngineThrottleMode(0);
        const rightThrottleDetent = Simplane.getEngineThrottleMode(1);
        const highestThrottleDetent = (leftThrottleDetent >= rightThrottleDetent) ? leftThrottleDetent : rightThrottleDetent;
        const ToPowerSet = (highestThrottleDetent == ThrottleMode.TOGA || highestThrottleDetent == ThrottleMode.FLEX_MCT) && SimVar.GetSimVarValue("ENG N1 RPM:1", "Percent") > 15 && SimVar.GetSimVarValue("ENG N1 RPM:2", "Percent") > 15;
        const APUPctRPM = SimVar.GetSimVarValue("APU PCT RPM", "percent");
        const EngModeSel = SimVar.GetSimVarValue("L:XMLVAR_ENG_MODE_SEL", "number");
        const spoilerOrFlapsDeployed = SimVar.GetSimVarValue("FLAPS HANDLE INDEX", "number") != 0 || SimVar.GetSimVarValue("SPOILERS HANDLE POSITION", "percent") != 0;

        const crzCond = ((spoilerOrFlapsDeployed || ToPowerSet) && (currFlightPhase == FlightPhase.FLIGHT_PHASE_CLIMB || currFlightPhase == FlightPhase.FLIGHT_PHASE_CRUISE) && this.CrzCondTimer <= 0) || (currFlightPhase == FlightPhase.FLIGHT_PHASE_CLIMB && !spoilerOrFlapsDeployed && !ToPowerSet);

        if ((currFlightPhase != FlightPhase.FLIGHT_PHASE_CLIMB || currFlightPhase == FlightPhase.FLIGHT_PHASE_CRUISE) || (!spoilerOrFlapsDeployed && !ToPowerSet) && this.CrzCondTimer >= 0) {
            this.CrzCondTimer = 60;
        } else if ((spoilerOrFlapsDeployed || ToPowerSet) && (currFlightPhase == FlightPhase.FLIGHT_PHASE_CLIMB || currFlightPhase == FlightPhase.FLIGHT_PHASE_CRUISE) && this.CrzCondTimer >= 0) {
            this.CrzCondTimer -= _deltaTime/1000;
        }

        if (EngModeSel == 2 || EngModeSel == 0 || this.MainEngineStarterOffTimer >= 0) {
            if (EngModeSel == 0 || EngModeSel == 2) {
                this.MainEngineStarterOffTimer = 10;
            } else if (this.MainEngineStarterOffTimer >= 0) {
                this.MainEngineStarterOffTimer -= _deltaTime / 1000;
            }
            this.pageNameWhenUnselected = "ENG";
        } else if (currentAPUMasterState && (APUPctRPM <= 95 || this.ApuAboveThresholdTimer >= 0)) {
            // Show Apu when master sw. is on, and N% is lower than 95, or until 10s after N% over 95
            if (this.ApuAboveThresholdTimer <= 0 && APUPctRPM <= 95) {
                this.ApuAboveThresholdTimer = 10;
            } else if (APUPctRPM >= 95) {
                this.ApuAboveThresholdTimer -= _deltaTime / 1000;
            }

            this.pageNameWhenUnselected = "APU";
        } else if (isACPowerAvailable && !engineOn && Simplane.getIsGrounded()) {
            // reset minIndex and cruise timer after shutdown
            this.minPageIndexWhenUnselected = 0;
            this.CrzCondTimer = 60;
            this.pageNameWhenUnselected = "DOOR";
        } else if (engineOn && !ToPowerSet && Simplane.getIsGrounded() && this.minPageIndexWhenUnselected <= 1) {
            const sidestickPosX = SimVar.GetSimVarValue("YOKE X POSITION", "Position");
            const sidestickPosY = SimVar.GetSimVarValue("YOKE Y POSITION", "Position");
            const rudderPos = SimVar.GetSimVarValue("RUDDER PEDAL POSITION", "Position");
            const controlsMoved = Math.abs(sidestickPosX) > 0.05 || Math.abs(sidestickPosY) > 0.05 || Math.abs(rudderPos) > 0.2;

            this.pageNameWhenUnselected = "WHEEL";
            // When controls are moved, show FCTL page for 20s
            if (controlsMoved) {
                this.pageNameWhenUnselected ="FTCL";
                this.ecamFCTLTimer = 20;
            } else if (this.ecamFCTLTimer >= 0) {
                this.pageNameWhenUnselected ="FTCL";
                this.ecamFCTLTimer -= _deltaTime / 1000;
            }
        } else if ((ToPowerSet || !Simplane.getIsGrounded()) && !crzCond && this.minPageIndexWhenUnselected <= 2) {
            this.pageNameWhenUnselected = "ENG";
        } else if (crzCond && !(isGearExtended && altitude < 16000) && this.minPageIndexWhenUnselected <= 3) {
            this.pageNameWhenUnselected = "CRZ";
            this.minPageIndexWhenUnselected = 3;
        } else if (isGearExtended && (altitude < 16000)) {
            this.pageNameWhenUnselected = "WHEEL";
            this.minPageIndexWhenUnselected = 4;
        }

        const sFailPage = SimVar.GetSimVarValue("L:A32NX_ECAM_SFAIL", "Enum");

        if (sFailPage != -1) {
            const ECAMPageIndices = {
                0: "ENG",
                1: "BLEED",
                2: "PRESS",
                3: "ELEC",
                4: "HYD",
                5: "FUEL",
                6: "APU",
                7: "COND",
                8: "DOOR",
                9: "WHEEL",
                10: "FTCL",
                11: "STS"
            };

            this.pageNameWhenUnselected = ECAMPageIndices[sFailPage];
        }

        // switch page when desired page was changed
        if (this.pageNameWhenUnselected != prevPage) {
            this.SwitchToPageName(this.LOWER_SCREEN_GROUP_NAME, this.pageNameWhenUnselected);
        }

        // modification ends here
    }

    updateScreenState() {
        if (SimVar.GetSimVarValue("L:ACPowerAvailable","bool")) {
            this.electricity.style.display = "block";
        } else {
            this.electricity.style.display = "none";
        }
    }

    updateAnnunciations() {
        let infoPanelManager = this.upperTopScreen.getInfoPanelManager();
        if (infoPanelManager) {

            // ----------- MODIFIED --------------------//
            let autoBrkValue = SimVar.GetSimVarValue("L:XMLVAR_Autobrakes_Level", "Number");
            let starterOne = SimVar.GetSimVarValue("GENERAL ENG STARTER:1", "Bool");
            let starterTwo = SimVar.GetSimVarValue("GENERAL ENG STARTER:2", "Bool");
            let splrsArmed = SimVar.GetSimVarValue("SPOILERS ARMED", "Bool");
            let flapsPosition = SimVar.GetSimVarValue("FLAPS HANDLE INDEX", "Number");
            // ----------- MODIFIED END --------------------//

            infoPanelManager.clearScreen(Airliners.EICAS_INFO_PANEL_ID.PRIMARY);


            if (this.warnings) {
                let text = this.warnings.getCurrentWarningText();
                if (text && text != "") {
                    let level = this.warnings.getCurrentWarningLevel();
                    switch (level) {
                        case 0:
                            infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, text, Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                            break;
                        case 1:
                            infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, text, Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.CAUTION);
                            break;
                        case 2:
                            infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, text, Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.WARNING);
                            break;
                    }
                }
            }

            // ----------- MODIFIED --------------------//
            if (this.beforeTakeoffPhase && starterOne && starterTwo) {
                if (autoBrkValue == 3) {
                    infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "T.O AUTO BRK MAX", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                } else {
                    infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "T.O AUTO BRK......MAX[color]blue", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                }
                infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "\xa0\xa0\xa0\xa0SIGNS ON", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                if (splrsArmed) {
                    infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "\xa0\xa0\xa0\xa0SPLRS ARM", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                } else {
                    infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "\xa0\xa0\xa0\xa0SPLRS.........ARM", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                }
                if (flapsPosition > 0) {
                    infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "\xa0\xa0\xa0\xa0FLAPS T.O", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                } else {
                    infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "\xa0\xa0\xa0\xa0FLAPS.........T.O", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                }
                infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, "\xa0\xa0\xa0\xa0T.O CONFIG", Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
            }
            // ----------- MODIFIED END --------------------//


            else if (this.annunciations) {
                let onGround = Simplane.getIsGrounded();
                for (let i = this.annunciations.displayWarning.length - 1; i >= 0; i--) {
                    if (!this.annunciations.displayWarning[i].Acknowledged)
                        infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, this.annunciations.displayWarning[i].Text, Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.WARNING);
                }
                for (let i = this.annunciations.displayCaution.length - 1; i >= 0; i--) {
                    if (!this.annunciations.displayCaution[i].Acknowledged)
                        infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, this.annunciations.displayCaution[i].Text, Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.CAUTION);
                }
                for (let i = this.annunciations.displayAdvisory.length - 1; i >= 0; i--) {
                    if (!this.annunciations.displayAdvisory[i].Acknowledged)
                        infoPanelManager.addMessage(Airliners.EICAS_INFO_PANEL_ID.PRIMARY, this.annunciations.displayAdvisory[i].Text, Airliners.EICAS_INFO_PANEL_MESSAGE_STYLE.INDICATION);
                }
            }
        }
    }
}
registerInstrument("a320-neo-eicas-element", A320_Neo_EICAS);
//# sourceMappingURL=A320_Neo_EICAS.js.map
