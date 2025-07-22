// TODOs
// - Report Parameter errors: e.g. with box mit fehlermeldungen hinzufügen
// - show additional parameters like: retransmission count in register settings
// - Add valid RegisterValues initially into textarea. Let this be the initialization; Remove set ExampleBTconfig()
// - add parsing-tolerance in textarea regarding lines, that are no registers
// - split content into several files: drawing => separate, report_print => separate
// - add HTML FD column and support also FD registers
// - decode all registers that where found. Only skip the calculations and stuff like that.

// import drawing functions
//import { drawBitTiming, drawPWMsymbols } from './draw_bits_svg.js';
import * as draw_svg from './draw_bits_svg.js';

// ... rest of your code
// global variable definitions
let par_clk_freq_g = 160; // Global variable for CAN clock frequency in MHz

const floatParams = [
  'par_clk_freq'
];

const checkboxParams = [
  'par_tms',
  'par_tdc_dat'
];

const floatResults = [
  'res_clk_period',
  'res_bitrate_arb',
  'res_bitrate_dat',
  'res_sp_arb',
  'res_sp_dat',
  'res_ssp_dat',
  'res_tqlen',
  'res_pwm_symbol_len_ns'
];

const exludeFromPrintResults = [
  'res_sspoffset_dat',
  'res_pwmo',
  'res_pwms',
  'res_pwml'
];

// when document is loaded: initialize page
document.addEventListener('DOMContentLoaded', init);

// ===================================================================================
// Initialisation when website is loaded
function init() {
  // set eventlistener: when parameter changes => calculate
  initEventListeners();

  // Initialize the clock frequency input field with default value
  initializeClockFrequencyHtmlField();

  // Initialize textarea with default register values
  initializeRegisterTextArea();
  
  // Process the default register values
  processUserRegisterValues();
}

// ===================================================================================
// Event-Listener activation
function initEventListeners() {
  // HTML BUTTON: Add event listener for the process register values button
  const processButton = document.getElementById('processRegisterValuesButton');
  if (processButton) {
    processButton.addEventListener('click', processUserRegisterValues);
  } else {
    console.warn('[Warning] Process register button not found in HTML');
  }

  // HTML CLK_FREQ NPUT: Add event listener for the CAN clock frequency input field
  const clkFreqHtmlField = document.getElementById('par_clk_freq');
  if (clkFreqHtmlField) {
    clkFreqHtmlField.addEventListener('change', handleClockFrequencyChange); // fires when focus leaves field
    //clkFreqHtmlField.addEventListener('input', handleClockFrequencyChange); // fires when input changes (during typing)
  } else {
    console.warn('[Warning] Clock frequency input field not found in HTML');
  }
}

// ===================================================================================
// Handle clock frequency change event
function handleClockFrequencyChange(event) {
  const newValue = parseFloat(event.target.value);
  const clkFreqField = event.target;
  
  // Update global variable with the new value from HTML
  if (!isNaN(newValue) && newValue > 0) {
    par_clk_freq_g = newValue;
    console.log(`[Info] Clock frequency updated to: ${par_clk_freq_g} MHz`);
    
    // Remove error highlighting if value is valid
    clkFreqField.classList.remove("input-error");
    
    // Execute processUserRegisterValues() after updating the global variable
    processUserRegisterValues();
  } else {
    console.warn('[Warning] Invalid clock frequency value:', event.target.value);
    // Add error highlighting to the input field
    clkFreqField.classList.add("input-error");
  }
}

// ===================================================================================
// Initialize the clock frequency input field with default value
function initializeClockFrequencyHtmlField() {
  const clkFreqHtmlField = document.getElementById('par_clk_freq');
  if (clkFreqHtmlField) {
    // Set the input field to the global variable value (default 160 MHz)
    clkFreqHtmlField.value = par_clk_freq_g;
    console.log(`[Info] Initialized HTML clock frequency field to: ${par_clk_freq_g} MHz`);
  } else {
    console.warn('[Warning] initializeClockFrequencyHtmlField(): Clock frequency input field not found in HTML');
  }
}

// ===================================================================================
// Initialize the register textarea with default values
function initializeRegisterTextArea() {
  const registerTextArea = document.getElementById('userInputRegisterValues');
  if (registerTextArea) {
    // Default register values - you can customize these
    const defaultRegisterValues = `MODE 0x00000607
NBTP 0x00FE3F3F
XBTP 0x08070606
PCFG 0x00000C04`;
    
    registerTextArea.value = defaultRegisterValues;
  } else {
    console.warn('[Warning] initializeRegisterTextArea(): Register textarea not found in HTML');
  }
}

// ===================================================================================
// Parameter: Validate ranges and return validation report
function paramsFromRegsXLBitTimeRangeValidate(params) {
  const validationReport = {
    reports: [],
    hasErrors: false,
    hasWarnings: false
  };

  // Check validity of parameters (format/type)
  // since "params" was created by this script (from Register), the format of the params does not need to be checked.
  // Hint: isValidNumber() assumes a string as parameter => so it will not work here, when the parameters are already numbers.

  // Check value range of parameters (value range)
  for (const id in params) {
    // Skip register structure entries
    if (id === 'reg') continue;
    
    // Skip non-parameter entries (transceiverType, canType, etc.) // TODO: check if this can be removed, add error messages instead
    if (!id.startsWith('par_')) continue;
    
    const value = params[id]; // Direct value access
    
    if (id == 'par_brp') {
      if (!((value >= 1) && (value <= 32))) { 
        validationReport.reports.push({
          severityLevel: 3, // error
          msg: `${id}: BRP is not in ISO11898-1:2024 range. Valid range: 1..32`
        });
        validationReport.hasErrors = true;
      }
    } else if (id == 'par_prop_and_phaseseg1_arb') {
      if (!((value >= 1) && (value <= 512))) { 
        validationReport.reports.push({
          severityLevel: 3, // error
          msg: `${id}: Arb. PropSeg + PhaseSeg1 is not in ISO11898-1:2024 range. Valid range: 1..512`
        });
        validationReport.hasErrors = true;
      }
    } else if (id == 'par_phaseseg2_arb') {
      if (!((value >= 2) && (value <= 128))) { 
        validationReport.reports.push({
          severityLevel: 3, // error
          msg: `${id}: Arb. PhaseSeg2 is not in ISO11898-1:2024 range. Valid range: 2..128`
        });
        validationReport.hasErrors = true;
      }
    } else if (id == 'par_sjw_arb') {
      if (params.par_phaseseg2_arb && !((value <= params.par_phaseseg2_arb))) { 
        validationReport.reports.push({
          severityLevel: 3, // error
          msg: `${id}: Arb. SJW > Arb. PhaseSeg2. Valid range: SJW <= min(PhaseSeg1, PhaseSeg2)`
        });
        validationReport.hasErrors = true;
      }
    } else if (id == 'par_prop_and_phaseseg1_dat') {
      if (!((value >= 1) && (value <= 256))) { 
        validationReport.reports.push({
          severityLevel: 3, // error
          msg: `${id}: Data PropSeg + PhaseSeg1 is not in ISO11898-1:2024 range. Valid range: 1..256`
        });
        validationReport.hasErrors = true;
      }
    } else if (id == 'par_phaseseg2_dat') {
      if (!((value >= 2) && (value <= 128))) { 
        validationReport.reports.push({
          severityLevel: 3, // error
          msg: `${id}: Data PhaseSeg2 is not in ISO11898-1:2024 range. Valid range: 2..128`
        });
        validationReport.hasErrors = true;
      }
    } else if (id == 'par_sjw_dat') {
      if (params.par_phaseseg2_dat && !((value <= params.par_phaseseg2_dat))) { 
        validationReport.reports.push({
          severityLevel: 2, // Warning
          msg: `${id}: Data SJW > Data PhaseSeg2. Valid range: SJW <= min(PhaseSeg1, PhaseSeg2)`
        });
        validationReport.hasWarnings = true;
      }
    } else { 
      // default check for positive values
      if (checkboxParams.includes(id)) {
        // no check
      } else {
        if (typeof value === 'number' && value >= 0) {
          // valid range - no action needed
        } else {
          // TODO: this is dead-code, cannot happen
          validationReport.reports.push({
            severityLevel: 3, // error
            msg: `${id}: Value must be a positive number`
          });
          validationReport.hasErrors = true;
        }
      }
    }
  }

  // Add success message if no range validation issues
  if (!validationReport.hasErrors && !validationReport.hasWarnings) {
    validationReport.reports.push({
      severityLevel: 0, // info
      msg: 'All parameter ranges are valid'
    });
  }
  
  return validationReport;
} // func paramsFromRegsRangeValidate
 
// ===================================================================================
// calculate results from params
function calculateResultsFromUserRegisterValues(params) {
  // input: params object with all parameters
  // output: results object with all calculated results
  
  const results = {};

  // Calculate results
  results['res_clk_period']   = 1000/par_clk_freq_g; // 1000 / MHz = ns
  results['res_tqperbit_arb'] = 1 + params.par_prop_and_phaseseg1_arb + params.par_phaseseg2_arb;
  results['res_tqperbit_dat'] = 1 + params.par_prop_and_phaseseg1_dat + params.par_phaseseg2_dat;
  results['res_bitrate_arb']  = par_clk_freq_g / (params.par_brp * results.res_tqperbit_arb);
  results['res_bitrate_dat']  = par_clk_freq_g / (params.par_brp * results.res_tqperbit_dat);
  results['res_sp_arb']       = (1 - params.par_phaseseg2_arb/results.res_tqperbit_arb) * 100;
  results['res_sp_dat']       = (1 - params.par_phaseseg2_dat/results.res_tqperbit_dat) * 100;

  if (params.par_tdc_dat === true) {
	  if (params.par_tms === false) {
	    results['res_sspoffset_dat']= (params.par_prop_and_phaseseg1_dat + 1)* params.par_brp - 1;
    } else { // true
	    results['res_sspoffset_dat']= 'TMS on';
    }
  } else { // tdc=false
	  results['res_sspoffset_dat']= 'TDC off';
	}
	
  if (typeof results.res_sspoffset_dat === "number") {
    results['res_ssp_dat'] = results.res_sspoffset_dat/(results.res_tqperbit_dat*params.par_brp) * 100;
  } else if (typeof results.res_sspoffset_dat === "string") {
	  results['res_ssp_dat'] = results.res_sspoffset_dat;
  }
  
  results['res_bitlength_arb'] = 1000 / results.res_bitrate_arb;
  results['res_bitlength_dat'] = 1000 / results.res_bitrate_dat;
	
  results['res_tqlen'] = results.res_clk_period * params.par_brp;

  // PWM Results
  results['res_pwm_symbol_len_ns']         = (params.par_pwms + params.par_pwml) * results.res_clk_period;
	results['res_pwm_symbol_len_clk_cycles'] = (params.par_pwms + params.par_pwml);
	results['res_pwm_symbols_per_bit_time']  = (results.res_tqperbit_dat * params.par_brp) / results.res_pwm_symbol_len_clk_cycles;
  
  return results; // return results object
}

// ===================================================================================
// parseUserRegisterValues: Parse text and generate object with registerName: value as integer
function parseUserRegisterValues(userRegText) {
  const registerValues = {};
  const validationReport = {
    reports: [],
    hasErrors: false,
    hasWarnings: false
  };
  const lines = userRegText.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) { // ignore empty lines
      // Expected format: "registerName: 0xAABBCCDD" or "registerName: AABBCCDD"
      const match = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s* \s*(0x)?([0-9a-fA-F]+)$/);
      if (match) {
        const registerName = match[1];
        const hexValue = match[3];
        const intValue = parseInt(hexValue, 16);
        if (!isNaN(intValue)) {
          registerValues[registerName] = intValue;
          validationReport.reports.push({
            severityLevel: 0, // info
            msg: `Parsed register ${registerName}: 0x${hexValue.toUpperCase()}`
          });
        } else {
          validationReport.reports.push({
            severityLevel: 3, // error
            msg: `Invalid hex value for ${registerName}: ${hexValue}`
          });
          validationReport.hasErrors = true;
        }
      } else {
        validationReport.reports.push({
          severityLevel: 3, // Error
          msg: `Invalid line format: "${trimmedLine}"`
        });
        validationReport.hasErrors = true;
      }
    }
  }
  
  // Add summary message
  const registerCount = Object.keys(registerValues).length;
  if (registerCount > 0) {
    validationReport.reports.push({
      severityLevel: 0, // info
      msg: `Registers parsed successfully: ${registerCount}`
    });
  }

  return { registerValues, validationReport };
}

// ===================================================================================
// examineUserRegisterValues: Check if all required registers are present
function examineUserRegisterPresenceXS_CAN(registerValues) {
  const requiredRegisters = ['MODE', 'NBTP', 'XBTP', 'PCFG']; // TODO: add DBTP, give list of results: BT, MH_RX, MH_TX, etc.
  const validationReport = {
    reports: [],
    hasErrors: false,
    hasWarnings: false
  };
  
  for (const regName of requiredRegisters) {
    if (!(regName in registerValues)) {
      validationReport.reports.push({
        severityLevel: 3, // error
        msg: `Missing required register: ${regName}`
      });
      validationReport.hasErrors = true;
    }
  }
  
  if (!validationReport.hasErrors) {
    validationReport.reports.push({
      severityLevel: 0, // info
      msg: 'All required registers are present for CAN XL Bit Timing'
    });
  }
  
  return validationReport;
}

// Helper function to extract bits from register value
function getBits(regVal, endBit, startBit) {
  const length = endBit - startBit + 1;
  const mask = (1 << length) - 1;
  return (regVal >> startBit) & mask;
}

// ===================================================================================
// decodeParamsFromUserRegisterValues: Extract parameters from register values
function decodeParamsFromUserRegisterValuesXS_CAN(registerValues, params) {
  // Initialize register structure
  params.reg = {
    mode: {},
    nbtp: {},
    xbtp: {},
    pcfg: {}
  };
  
  // Extract parameters from MODE register
  if ('MODE' in registerValues) {
    const modeReg = registerValues.MODE;
    
    // 1. Decode all individual bits of MODE register
    params.reg.mode.TSSE = getBits(modeReg, 13, 13);  // Transceiver Sharing Switch Enable
    params.reg.mode.LCHB = getBits(modeReg, 12, 12);  // Light Commander High Bit Rate
    params.reg.mode.FIME = getBits(modeReg, 11, 11);  // Fault Injection Module Enable
    params.reg.mode.EFDI = getBits(modeReg, 10, 10);  // Error Flag/Frame Dissable
    params.reg.mode.XLTR = getBits(modeReg, 9, 9);    // TMS Enable (XL Transceiver present)
    params.reg.mode.SFS  = getBits(modeReg, 8, 8);    // Time Stamp Position: Start of Frame (1), End of Frame (0)
    params.reg.mode.RSTR = getBits(modeReg, 7, 7);    // Restircted Mode Enable
    params.reg.mode.MON  = getBits(modeReg, 6, 6);    // (Bus) Monitoring Mode Enable
    params.reg.mode.TXP  = getBits(modeReg, 5, 5);    // TX Pause
    params.reg.mode.EFBI = getBits(modeReg, 4, 4);    // Edge Filtering during Bus Integration
    params.reg.mode.PXHD = getBits(modeReg, 3, 3);    // Protocol Exception Handling Disable
    params.reg.mode.TDCE = getBits(modeReg, 2, 2);    // TDC: Transmitter Delay Compensation Enable
    params.reg.mode.XLOE = getBits(modeReg, 1, 1);    // XL Operation Enable
    params.reg.mode.FDOE = getBits(modeReg, 0, 0);    // FD Operation Enable
    
    // 2. Decode values needed for bit timing calculation
    params.par_tms = (params.reg.mode.XLTR === 1);
    params.par_tdc_dat = (params.reg.mode.TDCE === 1);
  }
  
  // Extract parameters from NBTP register
  if ('NBTP' in registerValues) {
    const nbtpReg = registerValues.NBTP;
    
    // 1. Decode all individual bits of NBTP register
    params.reg.nbtp.BRP = getBits(nbtpReg, 29, 25);     // Bit Rate Prescaler
    params.reg.nbtp.NTSEG1 = getBits(nbtpReg, 24, 16);  // Nominal Time Segment 1
    params.reg.nbtp.NTSEG2 = getBits(nbtpReg, 14, 8);   // Nominal Time Segment 2
    params.reg.nbtp.NSJW = getBits(nbtpReg, 6, 0);      // Nominal Synchronization Jump Width
    
    // 2. Decode values needed for bit timing calculation
    params.par_brp = params.reg.nbtp.BRP + 1;
    params.par_prop_and_phaseseg1_arb = params.reg.nbtp.NTSEG1 + 1;
    params.par_phaseseg2_arb = params.reg.nbtp.NTSEG2 + 1;
    params.par_sjw_arb = params.reg.nbtp.NSJW + 1;
  }
  
  // Extract parameters from XBTP register
  if ('XBTP' in registerValues) {
    const xbtpReg = registerValues.XBTP;
    
    // 1. Decode all individual bits of XBTP register
    params.reg.xbtp.XTDCO = getBits(xbtpReg, 31, 24);   // XL Transmitter Delay Compensation Offset
    params.reg.xbtp.XTSEG1 = getBits(xbtpReg, 23, 16);  // XL Time Segment 1
    params.reg.xbtp.XTSEG2 = getBits(xbtpReg, 14, 8);   // XL Time Segment 2
    params.reg.xbtp.XSJW = getBits(xbtpReg, 6, 0);      // XL Synchronization Jump Width
    
    // 2. Decode values needed for bit timing calculation
    params.par_sspoffset_dat = params.reg.xbtp.XTDCO + 1;
    params.par_prop_and_phaseseg1_dat = params.reg.xbtp.XTSEG1 + 1;
    params.par_phaseseg2_dat = params.reg.xbtp.XTSEG2 + 1;
    params.par_sjw_dat = params.reg.xbtp.XSJW + 1;
  }
  
  // Extract parameters from PCFG register (if TMS is enabled)
  if ('PCFG' in registerValues) {
    const pcfgReg = registerValues.PCFG;
    
    // 1. Decode all individual bits of PCFG register
    params.reg.pcfg.PWMO = getBits(pcfgReg, 21, 16);    // PWM Offset
    params.reg.pcfg.PWML = getBits(pcfgReg, 13, 8);     // PWM Low
    params.reg.pcfg.PWMS = getBits(pcfgReg, 5, 0);      // PWM Short
    
    // 2. Decode values needed for calculation (if TMS is enabled)
    params.par_pwmo = params.reg.pcfg.PWMO;
    params.par_pwml = params.reg.pcfg.PWML + 1;
    params.par_pwms = params.reg.pcfg.PWMS + 1;
  }
 
  return params;
}

// ===================================================================================
// Process Nominal Bit Timing Register: Extract parameters, validate ranges, calculate results, generate report
function procRegsBitTiming(registerValues, params, reg, results) {

  // CAN Clock Frequency and Period: Calculate and Report
  results['res_clk_period']   = 1000/par_clk_freq_g; // 1000 / MHz = ns

  reg.general= {};
  reg.general.report = []; // Initialize report array

  reg.general.report.push({
      severityLevel: 0, // info
      msg: `CAN Clock\n   Frequency = ${par_clk_freq_g} MHz\n   Period = ${results.res_clk_period} ns`
  });


  // === MODE: Extract parameters from register ==========================
  if ('MODE' in registerValues) {
    const regValue = registerValues.MODE;
    
    // 0. Initialize register structure
    reg.mode = {};
    reg.mode.fields = {};
    reg.mode.report = []; // Initialize report array

    // 1. Decode all individual bits of MODE register
    reg.mode.fields.TSSE = getBits(regValue, 13, 13);  // Transceiver Sharing Switch Enable
    reg.mode.fields.LCHB = getBits(regValue, 12, 12);  // Light Commander High Bit Rate
    reg.mode.fields.FIME = getBits(regValue, 11, 11);  // Fault Injection Module Enable
    reg.mode.fields.EFDI = getBits(regValue, 10, 10);  // Error Flag/Frame Dissable
    reg.mode.fields.XLTR = getBits(regValue, 9, 9);    // TMS Enable (XL Transceiver present)
    reg.mode.fields.SFS  = getBits(regValue, 8, 8);    // Time Stamp Position: Start of Frame (1), End of Frame (0)
    reg.mode.fields.RSTR = getBits(regValue, 7, 7);    // Restircted Mode Enable
    reg.mode.fields.MON  = getBits(regValue, 6, 6);    // (Bus) Monitoring Mode Enable
    reg.mode.fields.TXP  = getBits(regValue, 5, 5);    // TX Pause
    reg.mode.fields.EFBI = getBits(regValue, 4, 4);    // Edge Filtering during Bus Integration
    reg.mode.fields.PXHD = getBits(regValue, 3, 3);    // Protocol Exception Handling Disable
    reg.mode.fields.TDCE = getBits(regValue, 2, 2);    // TDC: Transmitter Delay Compensation Enable
    reg.mode.fields.XLOE = getBits(regValue, 1, 1);    // XL Operation Enable
    reg.mode.fields.FDOE = getBits(regValue, 0, 0);    // FD Operation Enable
    
    // 2. Decode values needed for bit timing calculation
    params.par_tms = (reg.mode.fields.XLTR === 1);
    params.par_tdc_dat = (reg.mode.fields.TDCE === 1);

    // 3. Generete human-readable register report
    reg.mode.report.push({
        severityLevel: 0, // info
        msg: `Register MODE: Operating Mode\n   [TSSE] Transceiver Sharing Switch Enable = ${reg.mode.fields.TSSE}\n   [LCHB] FD Light Commander High Bit Rate Mode Enable = ${reg.mode.fields.LCHB}\n   [FIME] Fault Injection Module Enable = ${reg.mode.fields.FIME}\n   [EFDI] Error Flag/Frame Disable = ${reg.mode.fields.EFDI}\n   [XLTR] TMS Enable (XL Transceiver present) = ${reg.mode.fields.XLTR}\n   [SFS] Time Stamp Position: Start of Frame (1), End of Frame (0) = ${reg.mode.fields.SFS}\n   [RSTR] Restricted Mode Enable = ${reg.mode.fields.RSTR}\n   [MON] (Bus) Monitoring Mode Enable = ${reg.mode.fields.MON}\n   [TXP] TX Pause = ${reg.mode.fields.TXP}\n   [EFBI] Edge Filtering during Bus Integration = ${reg.mode.fields.EFBI}\n   [PXHD] Protocol Exception Handling Disable = ${reg.mode.fields.PXHD}\n   [TDCE] TDC: Transmitter Delay Compensation Enable = ${reg.mode.fields.TDCE}\n   [XLOE] XL Operation Enable = ${reg.mode.fields.XLOE}\n   [FDOE] FD Operation Enable = ${reg.mode.fields.FDOE}`
    });
  }

  // === NBTP: Extract parameters from register ==========================
  if ('NBTP' in registerValues) {
    const regValue = registerValues.NBTP;

    // 0. Initialize register structure
    reg.nbtp = {};
    reg.nbtp.fields = {};
    reg.nbtp.report = []; // Initialize report array

    // 1. Decode all individual bits of NBTP register
    reg.nbtp.fields.BRP    = getBits(regValue, 29, 25) + 1;  // Bit Rate Prescaler
    reg.nbtp.fields.NTSEG1 = getBits(regValue, 24, 16) + 1;  // Nominal Time Segment 1
    reg.nbtp.fields.NTSEG2 = getBits(regValue, 14, 8) + 1;   // Nominal Time Segment 2
    reg.nbtp.fields.NSJW   = getBits(regValue, 6, 0) + 1;    // Nominal Synchronization Jump Width

    // 2. Decode params needed for bit timing calculation
    params.par_brp = reg.nbtp.fields.BRP;
    params.par_prop_and_phaseseg1_arb = reg.nbtp.fields.NTSEG1;
    params.par_phaseseg2_arb = reg.nbtp.fields.NTSEG2;
    params.par_sjw_arb = reg.nbtp.fields.NSJW;

    // 3. Generete human-readable register report
    reg.nbtp.report.push({
        severityLevel: 0, // info
        msg: `Register NBTP: Arbitration Phase Nominal Bit Timing and Prescaler\n   [BRP] Bit Rate Prescaler = ${reg.nbtp.fields.BRP}\n   [NTSEG1] Nominal Time Segment 1 = ${reg.nbtp.fields.NTSEG1}\n   [NTSEG2] Nominal Time Segment 2 = ${reg.nbtp.fields.NTSEG2}\n   [NSJW] Nominal Synchronization Jump Width = ${reg.nbtp.fields.NSJW}`
    });

    // 4. calculate results
    results['res_tqlen']         = results.res_clk_period * params.par_brp;
    results['res_tqperbit_arb']  = 1 + params.par_prop_and_phaseseg1_arb + params.par_phaseseg2_arb;
    results['res_bitrate_arb']   = par_clk_freq_g / (params.par_brp * results.res_tqperbit_arb);
    results['res_bitlength_arb'] = 1000 / results.res_bitrate_arb;
    results['res_sp_arb']        = (1 - params.par_phaseseg2_arb/results.res_tqperbit_arb) * 100;
	
    // 5. Generate Report about settings
    reg.nbtp.report.push({
        severityLevel: 0, // info
        msg: `Nominal Bitrate (Arbitration Phase)\n   Bitrate = ${results.res_bitrate_arb} Mbit/s\n   Bit Length = ${results.res_bitlength_arb} ns\n   TQ per Bit = ${results.res_tqperbit_arb}, Sample Point = ${results.res_sp_arb}`
    });

    // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
    // TODO: check for phase segment length >= 2
  }

  // === DBTP: Extract parameters from register ==========================
  // TODO: implement DBTP register handling

  // === XBTP: Extract parameters from register ==========================
  if ('XBTP' in registerValues) {
    const regValue = registerValues.XBTP;

    // 0. Initialize register structure
    reg.xbtp = {};
    reg.xbtp.fields = {};
    reg.xbtp.report = []; // Initialize report array

    // 1. Decode all individual bits of XBTP register
    reg.xbtp.fields.XTDCO  = getBits(regValue, 31, 24) + 1;  // XL Transmitter Delay Compensation Offset
    reg.xbtp.fields.XTSEG1 = getBits(regValue, 23, 16) + 1;  // XL Time Segment 1
    reg.xbtp.fields.XTSEG2 = getBits(regValue, 14, 8) + 1;   // XL Time Segment 2
    reg.xbtp.fields.XSJW   = getBits(regValue, 6, 0) + 1;    // XL Synchronization Jump Width
    
    // 2. Decode values needed for bit timing calculation
    params.par_sspoffset_dat = reg.xbtp.fields.XTDCO;
    params.par_prop_and_phaseseg1_dat = reg.xbtp.fields.XTSEG1;
    params.par_phaseseg2_dat = reg.xbtp.fields.XTSEG2;
    params.par_sjw_dat = reg.xbtp.fields.XSJW;

    // different output based on XLOE
    if (reg.mode.fields.XLOE == 0) {
      // 3. Generete human-readable register report
      reg.xbtp.report.push({
        severityLevel: 2, // warning
        msg: `Register XBTP: XL Data Phase Bit Timing\n   XL Operation is disabled (MODE.XLOE=0)`
      });

      // 4. calculate results
      results['res_tqperbit_dat']  = 'OFF';
      results['res_bitrate_dat']   = 'OFF';
      results['res_bitlength_dat'] = 'OFF';
      results['res_sp_dat']        = 'OFF';


    } else { // MODE.XLOE == 1
      // 3. Generete human-readable register report
      reg.xbtp.report.push({
          severityLevel: 0, // info
          msg: `Register XBTP: XL Data Phase Bit Timing\n   [XTDCO] XL Transmitter Delay Compensation Offset = ${reg.xbtp.fields.XTDCO}\n   [XTSEG1] XL Time Segment 1 = ${reg.xbtp.fields.XTSEG1}\n   [XTSEG2] XL Time Segment 2 = ${reg.xbtp.fields.XTSEG2}\n   [XSJW] XL Synchronization Jump Width = ${reg.xbtp.fields.XSJW}`
      });

      // 4. calculate results
      results['res_tqperbit_dat']  = 1 + params.par_prop_and_phaseseg1_dat + params.par_phaseseg2_dat;
      results['res_bitrate_dat']   = par_clk_freq_g / (params.par_brp * results.res_tqperbit_dat);
      results['res_bitlength_dat'] = 1000 / results.res_bitrate_dat;
      results['res_sp_dat']        = (1 - params.par_phaseseg2_dat/results.res_tqperbit_dat) * 100;

      // 5. Generate Report about settings
      // Register content
      reg.xbtp.report.push({
          severityLevel: 0, // info
          msg: `XL Data Phase Bitrate\n   Bitrate = ${results.res_bitrate_dat} Mbit/s\n   Bit Length = ${results.res_bitlength_dat} ns\n   TQ per Bit = ${results.res_tqperbit_dat}\n   Sample Point = ${results.res_sp_dat}`
      });

      // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
      // TODO: check for phase segment length >= 2

      // CAN Clock Frequency as recommended in CiA 612-1?
      if ((par_clk_freq_g != 160) && (par_clk_freq_g != 80)) {
        reg.pcfg.report.push({
          severityLevel: 2, // warning
          msg: `Recommended CAN Clock Frequency for CAN XL is 80 MHz or 160 MHz. Current value is ${par_clk_freq_g} MHz.`
        });
      }

      // Minimum number of TQ/Bit?
      if (results.res_tqperbit_dat < 8) {
        reg.pcfg.report.push({
          severityLevel: 2, // warning
          msg: `Recommended minimum TQ per XL Data Bit is 8. Current number of TQ per XL Data bit = ${results.res_tqperbit_dat}.`
        });
      }

      // Ratio of Arb. Bit Time / XL Data Bit Time >= 2 ?
      if (reg.mode.fields.EFDI == 0) { // Error Signaling is enabled
        if (results.res_tqperbit_arb < (2 * results.res_tqperbit_dat)) {
          reg.pcfg.report.push({
            severityLevel: 3, // error
            msg: `Minimum Ratio of [XL Data Bitrate / Nominal Bitrate] = ${results.res_tqperbit_arb / results.res_tqperbit_dat}. Minimum ratio is 2, when Error Signaling is enabled (MODE.ESDI=0).`
          });
        }
      } // end if EFDI
    } // end if XLOE
    
  } // end if XBTP
  
  // === PCFG: Extract parameters from register (if TMS is enabled) ==============
  if ('PCFG' in registerValues) {
    const regValue = registerValues.PCFG;

    // 0. Initialize register structure
    reg.pcfg = {};
    reg.pcfg.fields = {};
    reg.pcfg.report = []; // Initialize report array

    // 1. Decode all individual bits of PCFG register
    reg.pcfg.fields.PWMO = getBits(regValue, 21, 16);     // PWM Offset
    reg.pcfg.fields.PWML = getBits(regValue, 13, 8) + 1;  // PWM Low
    reg.pcfg.fields.PWMS = getBits(regValue, 5, 0) + 1;   // PWM Short

    // 2. Decode values needed for calculation (if TMS is enabled)
    params.par_pwmo = reg.pcfg.fields.PWMO;
    params.par_pwml = reg.pcfg.fields.PWML;
    params.par_pwms = reg.pcfg.fields.PWMS;

    // different output based on XLOE & TMS
    if ((reg.mode.fields.XLOE == 0) || (reg.mode.fields.TMS == 0)) {
      // 3. Generete human-readable register report
      reg.pcfg.report.push({
        severityLevel: 2, // warning
        msg: `Register PCFG: PWME Configuration (PWM Symbols)\n   XL Operation (MODE.XLOE=0) OR Transceiver Mode Switch (MODE.TMS=0) is disabled`
      });

      // 4. calculate results
      results['res_pwm_symbol_len_ns']         = 'OFF';
    	results['res_pwm_symbol_len_clk_cycles'] = 'OFF';   
    	results['res_pwm_symbols_per_bit_time']  = 'OFF';

    } else { // MODE.TMS == 1
      // 3. Generete human-readable register report
      reg.pcfg.report.push({
          severityLevel: 0, // info
          msg: `Register PCFG: PWME Configuration (PWM Symbols)\n   [PWMO] PWM Offset = ${reg.pcfg.fields.PWMO}\n   [PWML] PWM phase Long = ${reg.pcfg.fields.PWML}\n   [PWMS] PWM phase Short = ${reg.pcfg.fields.PWMS}`
      });

      // 4. calculate results
      results['res_pwm_symbol_len_ns']         = (params.par_pwms + params.par_pwml) * results.res_clk_period;
	    results['res_pwm_symbol_len_clk_cycles'] = (params.par_pwms + params.par_pwml);
	    results['res_pwm_symbols_per_bit_time']  = (results.res_tqperbit_dat * params.par_brp) / results.res_pwm_symbol_len_clk_cycles;
      
      // 5. Generate Report about settings
      // Register content
      reg.pcfg.report.push({
          severityLevel: 0, // info
          msg: `PWM Configuration\n   PWM Symbol Length = ${results.res_pwm_symbol_len_ns} ns\n   PWM Symbol Length (clk cycles) = ${results.res_pwm_symbol_len_clk_cycles} clock cycles\n   PWM Symbols per XL Data Bit Time = ${results.res_pwm_symbols_per_bit_time}`
      });

      // Ratio of XL Data Bit Time to PWM Symbol Length
      if (!Number.isInteger(results.res_pwm_symbols_per_bit_time)) {
        reg.pcfg.report.push({
          severityLevel: 3, // error
          msg: `PWM Symbols per XL Data Bit Time (${results.res_pwm_symbols_per_bit_time.toFixed(2)}) is not an integer. Wrong PWM configuration.`
        });
      }

      // PWM Offset correctness
   		results['res_pwmo'] = (results.res_tqperbit_arb * params.par_brp) % results.res_pwm_symbol_len_clk_cycles;
      if (results.res_pwmo !== params.par_pwmo) {
        reg.pcfg.report.push({
          severityLevel: 3, // error
          msg: `PWM Offset (PCFG.PWMO = ${params.par_pwmo}) is wrong. Correct value is PCFG.PWMO = ${results.res_pwmo}`
        });
      }

    } // end if XLOE || TMS

  } // end if PCFG

}


// ===================================================================================
// generateRegisterBitReport: Generate detailed register bit information
function generateRegisterFieldReport(params) {
  // Hint: Register Name is derived from structure key, e.g., 'mode' -> 'MODE'

  const validationReport = {
    reports: [],
    hasErrors: false,
    hasWarnings: false
  };

  if (!params.reg) {
    validationReport.reports.push({
      severityLevel: 3, // Error
      msg: 'No register structure found in parameters'
    });
    validationReport.hasErrors = true;
    return validationReport;
  }

  // Generic processing of all register objects
  for (const [registerKey, registerObj] of Object.entries(params.reg)) {
    if (registerObj && typeof registerObj === 'object') {
      // Convert register key to uppercase for display (e.g., 'mode' -> 'MODE')
      const registerName = registerKey.toUpperCase();
      
      // Generate field list for this register
      const registerFields = Object.entries(registerObj)
        .map(([field, value]) => `${field}=${value}`)
        .join(', ');
      
      // Add register bit report
      validationReport.reports.push({
        severityLevel: 0, // info
        msg: `Register ${registerName}: ${registerFields}`
      });
    }
  }

  // Add summary message
  const registerCount = Object.keys(params.reg).length;
  if (registerCount > 0) {
    validationReport.reports.push({
      severityLevel: 0, // info
      msg: `Registers printed: ${registerCount}`
    });
  }

  return validationReport;
}

// ===================================================================================
// checkConsistencyOfUserRegisterValues: Check consistency between params and results
function checkConsistencyOfUserRegisterValues(params, results) {
  const validationReport = {
    reports: [],
    hasErrors: false,
    hasWarnings: false
  };
  
  // Check if TDC is enabled for high bit rates (>= 1 Mbit/s)
  if (results.res_bitrate_dat >= 1.0 && !params.par_tdc_dat) {
    validationReport.reports.push({
      severityLevel: 1, // recommendation
      msg: 'TDC should be enabled for data bit rates >= 1 Mbit/s'
    });
  }
  
  // Check PWM consistency (if TMS is enabled)
  if (params.par_tms) {
    // PWM proporties
     validationReport.reports.push({
       severityLevel: 0, // Info
       msg: `PWM: length = ${results.res_pwm_symbol_len_clk_cycles} clock cycles = ${results.res_pwm_symbol_len_ns.toFixed(2)} ns, PWM symbols per XL data bit = ${results.res_pwm_symbols_per_bit_time.toFixed(2)} symbols`
     });
   
    // check if PWM length matches data bit length
    const mtq_per_xldata_bit = results.res_tqperbit_dat * params.par_brp;
    if ((((mtq_per_xldata_bit) % results.res_pwm_symbol_len_clk_cycles) > 0) || (mtq_per_xldata_bit < results.res_pwm_symbol_len_clk_cycles)) {
      validationReport.reports.push({
        severityLevel: 3, // Error
        msg: `PWM length (${mtq_per_xldata_bit} clock cycles) != PWM symbol length (${results.res_pwm_symbol_len_clk_cycles} clock cycles)`
      });
      validationReport.hasErrors = true;      
    }

    // check if PWMO correctness
    if (((mtq_per_xldata_bit - params.par_pwmo) % results.res_pwm_symbol_len_clk_cycles) > 0) {
      validationReport.reports.push({
        severityLevel: 3, // Error
        msg: `PWM Offset (PWMO) has wrong value: ${params.par_pwmo} clock cycles`
      });
      validationReport.hasErrors = true;      
    }
  }
  
  // Check if sample point is within reasonable range (70-90%)
  if (results.res_sp_arb < 70 || results.res_sp_arb > 90) {
    validationReport.reports.push({
      severityLevel: 2, // warning
      msg: `Arbitration sample point (${results.res_sp_arb.toFixed(1)}%) is outside recommended range (70-90%)`
    });
    validationReport.hasWarnings = true;
  }
 
  // Check if SJW is not larger than phase segments
  if (params.par_sjw_arb > params.par_phaseseg2_arb) {
    validationReport.reports.push({
      severityLevel: 3, // error
      msg: 'Arbitration SJW is larger than minimum phase segment'
    });
    validationReport.hasErrors = true;
  }
  
  if (params.par_sjw_dat > params.par_phaseseg2_dat) {
    validationReport.reports.push({
      severityLevel: 3, // error
      msg: 'Data SJW is larger than minimum phase segment'
    });
    validationReport.hasErrors = true;
  }
  
  // Add success message if no issues found
  if (validationReport.reports.length === 0) {
    validationReport.reports.push({
      severityLevel: 0, // info
      msg: 'All consistency checks passed'
    });
  }
  
  return validationReport;
}

// ===================================================================================
// displayValidationReport: Format and display validation reports in HTML textarea
function displayValidationReport(parseValidationReport, reg) {
  const reportTextArea = document.getElementById('reportTextArea');
  if (!reportTextArea) {
    console.warn('[Warning] displayValidationReport(): Report textarea not found in HTML');
    return;
  }
  
  // Clear previous content
  reportTextArea.value = '';
  
  // Generate allRegReports from reg object
  const allRegReports = [];
  if (reg && typeof reg === 'object') {
    Object.values(reg).forEach(regSection => {
      if (regSection && regSection.report && Array.isArray(regSection.report)) {
        allRegReports.push(...regSection.report);
      }
    });
  }
  
  // Combine all validation reports into a single array
  const allValidationReports = [];
  
  // Add parse validation reports if provided
  if (parseValidationReport && Array.isArray(parseValidationReport.reports)) {
    allValidationReports.push(...parseValidationReport.reports);
  }
  
  // Add register reports
  allValidationReports.push(...allRegReports);
  
  if (allValidationReports.length === 0) {
    reportTextArea.value = 'No validation reports available.';
    return;
  }
  
  // Helper function to get severity level text
  function getSeverityText(level) {
    switch (level) {
      case 0: return 'I';
      case 1: return 'R';
      case 2: return 'W';
      case 3: return 'E';
      default: return 'UNKNOWN';
    }
  }
  
  // Helper function to get severity symbol
  function getSeveritySymbol(level) {
    switch (level) {
      case 0: return 'ℹ️';
      case 1: return '💡';
      case 2: return '⚠️';
      case 3: return '❌';
      default: return '❓';
    }
  }
  
  // Sort reports by severity level (errors first, then warnings, etc.)
  //const sortedReports = [...allValidationReports].sort((a, b) => b.severityLevel - a.severityLevel);
  // I do not want sorting!

  // Count reports by severity
  const counts = { errors: 0, warnings: 0, recommendations: 0, info: 0 };
  allValidationReports.forEach(report => {
    switch (report.severityLevel) {
      case 3: counts.errors++; break;
      case 2: counts.warnings++; break;
      case 1: counts.recommendations++; break;
      case 0: counts.info++; break;
    }
  });
  
  // Generate header with summary
  const timestamp = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  let reportText = `=== VALIDATION REPORT ${timestamp} ========\n`;
  //reportText += `Total reports: ${sortedReports.length}\n`;
  if (counts.errors > 0) reportText += `❌ Errors: ${counts.errors}\n`;
  if (counts.warnings > 0) reportText += `⚠️ Warnings: ${counts.warnings}\n`;
  if (counts.recommendations > 0) reportText += `💡 Recommendations: ${counts.recommendations}\n`;
  if (counts.info > 0) reportText += `ℹ️ Info: ${counts.info}\n`;
  reportText += ''.padEnd(51, '-') + '\n';
  
  // Generate detailed reports
  allValidationReports.forEach((report, index) => {
    const severityText = getSeverityText(report.severityLevel);
    const severitySymbol = getSeveritySymbol(report.severityLevel);
    
    // Add 10 spaces after line breaks for proper alignment
    const formattedMsg = report.msg.replace(/\n/g, '\n        ');
    
    reportText += `${severitySymbol} [${severityText}] ${formattedMsg}\n`;
  });
  
  // Add footer
  //reportText += ''.padEnd(50, '=') + '\n';
  reportText += '=== End of validation report ======================';
  
  // Display in textarea
  reportTextArea.value = reportText;
  
  // Scroll to top of textarea
  reportTextArea.scrollTop = 0;
}

// ===================================================================================
// display parameters in HTML fields
function displayParameters(params) {
  // Display: Parameters in HTML fields

  for (const [id, value] of Object.entries(params)) {
    // Skip register structure entries and non-parameter entries
    if (id === 'reg' || !id.startsWith('par_')) continue;

    const field = document.getElementById(id);
    if (field) {
      if (checkboxParams.includes(id)) {
        field.checked = value;
      } else {
        field.value = value;
      }
    }
  }
}

// ===================================================================================
// Display Results in HTML fields
function displayResults(results) {

  for (const [id, val] of Object.entries(results)) {
    if (exludeFromPrintResults.includes(id)) {
      // this result is not to be printed, since not HTML field exists for it
      continue; // skip to next iteration
      // TODO: generate to result objects, internal/external results, instead of not printing some, or add flag noprint = true
    }

    const field = document.getElementById(id);
    // check if field exists
    if (!field) {
      console.warn(`[Warning] Field with id "${id}" does not exist in HTML.`);
      continue; // skip to next iteration
    }

    if (typeof val === "string") {
		// val is a String, e.g. "err"
		field.value = val;
	  field.classList.remove("input-error");
	  } else if (typeof val === 'number' && !isNaN(val)) { // number assumed
		  field.value = floatResults.includes(id) ? val.toFixed(2) : Math.round(val);
		  field.classList.remove("input-error");
      // console.log(`[Info] printResults(): ${id} = ${field.value}`); // debug output
    } else { // value == null
	    // this line should never be used
		  field.value = 'ERR2';
      field.classList.add("input-error");
      console.warn(`[Warning] result "${id}" contains no number, nor string:`, val);
    }
  }
}

// ===================================================================================
// Display SVGs in HTML
function displaySVGs(params, results) {

    // Draw Bit Timing: Arbitration Phase
  draw_svg.drawBitTiming(
    0,
    params.par_prop_and_phaseseg1_arb,
    params.par_phaseseg2_arb,
    results.res_sp_arb, // Sample Point in % of Bit Time
    params.par_sjw_arb, // SJW Length in TQ
    0, // SSP in % of Bit Time => not used because TDC = false
    false, // TDC disabled (false)
    'DrawingBTArb', // name of SVG element in HTML
    'Arbitration Phase' // label in Drawing
  ); 
  
  // Draw Bit Timing: XL Data Phase
  draw_svg.drawBitTiming(
    0,
    params.par_prop_and_phaseseg1_dat,
    params.par_phaseseg2_dat,
    results.res_sp_dat, // Sample Point in % of Bit Time
    params.par_sjw_dat, // SJW Length in TQ
    results.res_ssp_dat, // SSP in % of Bit Time
    params.par_tdc_dat, // TDC enabled (true) or disabled (false)
    'DrawingBTXLdata', // name of SVG element in HTML
    'XL Data Phase' // label in Drawing
  ); 

  // Draw PWM symbols for XL Data Phase
  if (params.par_tms === true) {
      draw_svg.drawPWMsymbols(params.par_pwms, params.par_pwml, results.res_pwm_symbols_per_bit_time, 'DrawingBTXLdataPWM', 'XL Data Phase PWM symbols');
  } else {
    // Draw PWM symbols with error message
    draw_svg.drawPWMsymbols(0, 0, 0, 'DrawingBTXLdataPWM', 'XL Data Phase: TMS = off');
  }

  // Legend for Bit Timing Drawings: adapt width to table width
  document.getElementById("DrawingBTLegend").style.width =   document.getElementById("BitTimingTable").offsetWidth + "px";
}

// ===================================================================================
// Process User Register Values from Text Area - Updated main function
function processUserRegisterValues() {
  const paramsFromRegs = {}; // Initialize params object
  const results = {}; // Initialize results object
  const reg = {}; // Initialize register object

  // Init Test stuff
  const paramsFromRegsTest = {}; // Initialize params object
  const regTest = {}; // Initialize register object
  const resultTest = {}; // Initialize result object

  // get the text area content
  const userRegText = document.getElementById('userInputRegisterValues').value;
  
  // a) Parse the text and generate an object
  const parseResult = parseUserRegisterValues(userRegText);
  const registerValues = parseResult.registerValues;
  const parseValidationReport = parseResult.validationReport;
  console.log('[Info] Parsed register values:', registerValues);
  // Check for parsing errors
  if (parseValidationReport.hasErrors) {
    // Display all validation reports accumulated so far
    displayValidationReport(parseValidationReport);
    return;
  }
  
  // TODO NEXT STEP: new function procRegBitTiming tut.
  // TODO: umbauen, so dass IP-Modul wählbar: M_CAN, XS_CAN, X_CAN, etc.
    
  // b) Check if all required registers are present
//  const registerPresenceValidationReport = examineUserRegisterPresenceXS_CAN(registerValues);
//  if (registerPresenceValidationReport.hasErrors) {
//    // Display all validation reports accumulated so far
//    displayValidationReport(parseValidationReport, registerPresenceValidationReport);
//    return;
//  }

  // c1) Process Bit Timing  registers
//  procRegsBitTiming(registerValues, paramsFromRegsTest, regTest, resultTest);
//  console.log('[Info] Experimental regTest object:', regTest);
//  console.log('[Info] Experimental paramsFromRegsTest object:', paramsFromRegsTest);

  procRegsBitTiming(registerValues, paramsFromRegs, reg, results);
  console.log('[Info] Registers with data and reports, reg object:', reg);
  console.log('[Info] Decoded params object:', paramsFromRegs);
  console.log('[Info] Calculated results:', results);

//  // c) Generate params object from register values
//  decodeParamsFromUserRegisterValuesXS_CAN(registerValues, paramsFromRegs);
//  console.log('[Info] Decoded parameters:', paramsFromRegs);

//  // Generate validation report for bits/fields in registers
//  const registerFieldsDecodeReport = generateRegisterFieldReport(paramsFromRegs);

//  // d) Validate parameter ranges
//  const paramRangeValidationReport = paramsFromRegsXLBitTimeRangeValidate(paramsFromRegs);
//  console.log('[Info] Validated (Range) parameters:');

//  // e) Calculate results from decoded parameters
//  const results = calculateResultsFromUserRegisterValues(paramsFromRegs);
//  console.log('[Info] Calculated results:', results);
  
//  // f) Check consistency
//  //    e.g. if parameter combinanation is meaningful, e.g. TDC at > 1 Mbit/s, etc.
//  const consistencyValidation = checkConsistencyOfUserRegisterValues(paramsFromRegs, results, registerValues);
//  console.log('[Info] Checked Consistency of User Register Values');

  // Display in HTML =====================================
  // display parameters in HTML fields
  displayParameters(paramsFromRegs);

  // Display calculation results in HTML fields
  displayResults(results);

  // Display SVGs in HTML
  displaySVGs(paramsFromRegs, results); 

  // Display: Validation Reports in HTML textarea
  displayValidationReport(parseValidationReport, reg);
}