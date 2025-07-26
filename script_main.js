// TODOs
// - Report Parameter errors: e.g. with box mit fehlermeldungen hinzufügen
// - show additional parameters like: retransmission count in register settings
// - Add valid RegisterValues initially into textarea. Let this be the initialization; Remove set ExampleBTconfig()
// - add parsing-tolerance in textarea regarding lines, that are no registers
// - split content into several files: drawing => separate, report_print => separate
// - add HTML FD column and support also FD registers
// - decode all registers that where found. Only skip the calculations and stuff like that.

// import drawing functions
import * as draw_svg from './draw_bits_svg.js';
import * as x_can from './x_can.js';

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
    // Default register values in new address-value format
    const defaultRegisterValues = `0x060 0x00000607
0x064 0x00FE3F3F
0x06C 0x08070606
0x070 0x00000C04`;
    
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
// parseUserRegisterValues: Parse text and generate raw register array with addr and value
function parseUserRegisterValues(userRegText, reg) {
  // Initialize parse output in reg object
  reg.parse_output = {
    report: [],
    hasErrors: false,
    hasWarnings: false
  };
  
  // Initialize raw register array
  reg.raw = [];
  
  const lines = userRegText.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) { // ignore empty lines
      // Expected format: "0x000 0x87654321" or "000 87654321"
      const match = trimmedLine.match(/^(0x)?([0-9a-fA-F]+)\s+(0x)?([0-9a-fA-F]+)$/);
      if (match) {
        const addrHex = match[2];
        const valueHex = match[4];
        
        const addrValue = parseInt(addrHex, 16);
        const intValue = parseInt(valueHex, 16);
        
        if (!isNaN(addrValue) && !isNaN(intValue)) {
          // Store in raw register array
          reg.raw.push({
            addr: addrValue,
            value_int32: intValue
          });
          
          reg.parse_output.report.push({
            severityLevel: 0, // info
            msg: `Parsed register at address 0x${addrHex.toUpperCase()}: 0x${valueHex.toUpperCase()}`
          });
        } else {
          reg.parse_output.report.push({
            severityLevel: 3, // error
            msg: `Invalid hex values in line: "${trimmedLine}"`
          });
          reg.parse_output.hasErrors = true;
        }
      } else {
        reg.parse_output.report.push({
          severityLevel: 3, // Error
          msg: `Invalid line format: "${trimmedLine}". Expected format: "0x000 0x87654321"`
        });
        reg.parse_output.hasErrors = true;
      }
    }
  }
  
  // Add summary message
  const registerCount = reg.raw.length;
  if (registerCount > 0) {
    reg.parse_output.report.push({
      severityLevel: 0, // info
      msg: `Raw registers parsed successfully: ${registerCount}`
    });
  }

  return reg.parse_output;
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
function displayValidationReport(reg) {
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
    // Add reports from each register section
    Object.values(reg).forEach(regSection => {
      if (regSection && regSection.report && Array.isArray(regSection.report)) {
        allRegReports.push(...regSection.report);
      }
    });
  }
  
  // Combine all validation reports into a single array
  const allValidationReports = [];
  
  // Add register reports (which now includes parse output)
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
  // Basic idea of this function:
  // 1. Parse user input from textarea into raw register array
  // 2. Process with the appropriate CAN IP Module function
  //    This function fills the content of the objects: paramsHtml, resultsHtml, reg
  // 4. Display data from params, results, reg in HTML fields and SVGs

  const paramsHtml = {}; // Initialize params object
  const resultsHtml = {}; // Initialize results object
  const reg = {}; // Initialize register object

  // pre-process: global clock frequency from HTML input
  // CAN Clock Frequency and Period: Calculate and Report
  resultsHtml['res_clk_period']   = 1000/par_clk_freq_g; // 1000 / MHz = ns
  reg.general= {};
  reg.general.report = []; // Initialize report array
  // generate report for CAN Clock
  reg.general.report.push({
      severityLevel: 0, // info
      msg: `CAN Clock\n   Frequency = ${par_clk_freq_g} MHz\n   Period    = ${resultsHtml.res_clk_period} ns`
  });

  // get the text area content
  const userRegText = document.getElementById('userInputRegisterValues').value;
  
  // a) Step 1: Parse the text and generate raw register array
  parseUserRegisterValues(userRegText, reg);
  console.log('[Info] Step 1 - Parsed raw register values:', reg.raw);
  // Check for parsing errors
  if (reg.parse_output.hasErrors) {
    // Display all validation reports accumulated so far
    displayValidationReport(reg);
    return;
  }
  
  // TODO: umbauen, so dass IP-Modul wählbar: M_CAN, XS_CAN, X_CAN, etc.
  x_can.processRegsOfX_CAN(reg, paramsHtml, resultsHtml, par_clk_freq_g);

  // Display in HTML =====================================
  // display parameters in HTML fields
  displayParameters(paramsHtml);

  // Display calculation results in HTML fields
  displayResults(resultsHtml);

  // Display SVGs in HTML
  displaySVGs(paramsHtml, resultsHtml); 

  // Display: Validation Reports in HTML textarea
  displayValidationReport(reg);
}