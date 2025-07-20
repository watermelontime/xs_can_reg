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

//const paramFields  = Array.from(document.querySelectorAll('input[id^="par_"], select[id^="par_"]'));
//const resultFields = Array.from(document.querySelectorAll('input[id^="res_"]'));

// when document is loaded: initialize page
document.addEventListener('DOMContentLoaded', init);

// ===================================================================================
// Initialisation when website is loaded
function init() {
  // set eventlistener: when parameter changes => calculate
  initEventListeners();

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
  results['res_clk_period']   = 1000/params.par_clk_freq;
  results['res_tqperbit_arb'] = 1 + params.par_prop_and_phaseseg1_arb + params.par_phaseseg2_arb;
  results['res_tqperbit_dat'] = 1 + params.par_prop_and_phaseseg1_dat + params.par_phaseseg2_dat;
  results['res_bitrate_arb']  = params.par_clk_freq / (params.par_brp * results.res_tqperbit_arb);
  results['res_bitrate_dat']  = params.par_clk_freq / (params.par_brp * results.res_tqperbit_dat);
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

// ===================================================================================
// decodeParamsFromUserRegisterValues: Extract parameters from register values
function decodeParamsFromUserRegisterValuesXS_CAN(registerValues) {
  const params = {};
  
  // Initialize register structure
  params.reg = {
    mode: {},
    nbtp: {},
    xbtp: {},
    pcfg: {}
  };
  
  // Helper function to extract bits from register value
  function getBits(regVal, endBit, startBit) {
    const length = endBit - startBit + 1;
    const mask = (1 << length) - 1;
    return (regVal >> startBit) & mask;
  }
  
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
  
  // TODO: how to deal with CAN_CLK: set in HTML, read on change into global variable?
  // Set default values for missing parameters
  if (!('par_clk_freq' in params)) {
    params.par_clk_freq = 160; // Default 160 MHz
  }

  return params;
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
function displayValidationReport(...validationReports) {
  const reportTextArea = document.getElementById('reportTextArea');
  if (!reportTextArea) {
    console.warn('[Warning] displayValidationReport(): Report textarea not found in HTML');
    return;
  }
  
  // Clear previous content
  reportTextArea.value = '';
  
  // Combine all validation reports into a single array
  const allValidationReports = [];
  validationReports.forEach(report => {
    if (report && Array.isArray(report.reports)) {
      // If it's a validation report object with reports array
      allValidationReports.push(...report.reports);
    } else if (Array.isArray(report)) {
      // If it's already an array of reports
      allValidationReports.push(...report);
    } else if (report && typeof report === 'object' && report.msg) {
      // If it's a single report object
      allValidationReports.push(report);
    }
  });
  
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
    
    reportText += `${severitySymbol} [${severityText}] ${report.msg}\n`;
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
  
  // b) Check if all required registers are present
  const registerPresenceValidationReport = examineUserRegisterPresenceXS_CAN(registerValues);
  if (registerPresenceValidationReport.hasErrors) {
    // Display all validation reports accumulated so far
    displayValidationReport(parseValidationReport, registerPresenceValidationReport);
    return;
  }
  
  // c) Generate params object from register values
  const paramsFromRegs = decodeParamsFromUserRegisterValuesXS_CAN(registerValues);
  console.log('[Info] Decoded parameters:', paramsFromRegs);

  // Generate validation report for bits/fields in registers
  const registerFieldsValidationReport = generateRegisterFieldReport(paramsFromRegs);

  // d) Validate parameter ranges
  const paramRangeValidationReport = paramsFromRegsXLBitTimeRangeValidate(paramsFromRegs);
  console.log('[Info] Validated (Range) parameters:');

  // e) Calculate results from decoded parameters
  const results = calculateResultsFromUserRegisterValues(paramsFromRegs);
  console.log('[Info] Calculated results:', results);
  
  // f) Check consistency
  //    e.g. if parameter combinanation is meaningful, e.g. TDC at > 1 Mbit/s, etc.
  const consistencyValidation = checkConsistencyOfUserRegisterValues(paramsFromRegs, results, registerValues);
  console.log('[Info] Checked Consistency of User Register Values');

  // Display in HTML =====================================
  // display parameters in HTML fields
  displayParameters(paramsFromRegs);

  // Display calculation results in HTML fields
  displayResults(results);

  // Display SVGs in HTML
  displaySVGs(paramsFromRegs, results); 

  // Display: Validation Reoprts in HTML textarea
  displayValidationReport(parseValidationReport, registerPresenceValidationReport, registerFieldsValidationReport, paramRangeValidationReport, consistencyValidation);

  // Copilot: Enable inline code change! Not via Chat!
  // TODO: read CAN_CLK from HTML and set params.par_clk_freq (event listener on change of CAN_CLK input field)
  // TODO: new HTML parameter: Error Signaling (ES) enabled/disabled: par_es
}