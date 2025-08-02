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
    const defaultRegisterValues = `0x000 0x87654321
0x004 0x00000011
0x008 0x00000000
0x020 0x00000100
0x048 0x00000000
0x04c 0x00000008
0x060 0x00000607
0x064 0x00fe3f3f
0x068 0x100f0e0e
0x06c 0x0a090808
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
// displayValidationReport: Format and display validation reports in HTML with colors
function displayValidationReport(reg) {
  const reportTextArea = document.getElementById('reportTextArea');
  if (!reportTextArea) {
    console.warn('[Warning] displayValidationReport(): Report textarea not found in HTML');
    return;
  }
  
  // Clear previous content
  reportTextArea.innerHTML = '';
  
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
    reportTextArea.innerHTML = 'No validation reports available.';
    return;
  }
  
  // Helper function to get severity level text
  function getSeverityText(level) {
    switch (level) {
      case 0: return 'I';
      case 1: return 'R';
      case 2: return 'W';
      case 3: return 'E';
      case 4: return 'C';
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
      case 4: return '🧮';
      default: return '❓';
    }
  }
  
  // Helper function to get CSS class for severity level
  function getSeverityClass(level) {
    switch (level) {
      case 0: return 'report-info';
      case 1: return 'report-recommendation';
      case 2: return 'report-warning';
      case 3: return 'report-error';
      case 4: return 'report-infoCalculated';
      default: return 'report-info';
    }
  }
  
  // Count reports by severity
  const counts = { errors: 0, warnings: 0, recommendations: 0, info: 0, calculated: 0 };
  allValidationReports.forEach(report => {
    switch (report.severityLevel) {
      case 3: counts.errors++; break;
      case 2: counts.warnings++; break;
      case 1: counts.recommendations++; break;
      case 0: counts.info++; break;
      case 4: counts.calculated++; break;
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
  let reportText = `<span class="report-header">=== VALIDATION REPORT ${timestamp} ========</span>\n`;
  //reportText += `Total reports: ${sortedReports.length}\n`;
  if (counts.errors > 0) reportText += `<span class="report-error">❌ Errors: ${counts.errors}</span>\n`;
  if (counts.warnings > 0) reportText += `<span class="report-warning">⚠️ Warnings: ${counts.warnings}</span>\n`;
  if (counts.recommendations > 0) reportText += `<span class="report-recommendation">💡 Recommendations: ${counts.recommendations}</span>\n`;
  if (counts.info > 0) reportText += `<span class="report-info">ℹ️ Info: ${counts.info}</span>\n`;
  if (counts.calculated > 0) reportText += `<span class="report-infoCalculated">🧮 Calculated: ${counts.calculated}</span>\n`;
  reportText += '<span class="report-header">' + ''.padEnd(51, '-') + '</span>\n';
  
  // Generate detailed reports
  allValidationReports.forEach((report, index) => {
    const severityText = getSeverityText(report.severityLevel);
    const severitySymbol = getSeveritySymbol(report.severityLevel);
    const severityClass = getSeverityClass(report.severityLevel);
    
    // Add 10 spaces after line breaks for proper alignment and escape HTML
    const formattedMsg = report.msg
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '\n      '); // indentation of lines 2 to N
    
    //reportText += `<span class="${severityClass}">${severitySymbol} [${severityText}] ${formattedMsg}</span>\n`;
    reportText += `<span class="${severityClass}">${severitySymbol} ${formattedMsg}</span>\n`;
  });
  
  // Add footer
  reportText += '<span class="report-header">=== End of validation report ======================</span>';
  
  // Display in element using innerHTML
  reportTextArea.innerHTML = reportText;
  
  // Scroll to top
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
function displaySVGs(reg) {

  // check if all input parameters are defined for calling drawBitTiming()
  if (reg.general && reg.general.bt_arb && reg.general.bt_arb.set && reg.general.bt_arb.res &&
      reg.general.bt_arb.set.prop_and_phaseseg1 !== undefined &&
      reg.general.bt_arb.set.phaseseg2 !== undefined &&
      reg.general.bt_arb.res.sp !== undefined &&
      reg.general.bt_arb.set.sjw !== undefined) {
    // Draw Bit Timing: Arbitration Phase
    draw_svg.drawBitTiming(
      0,
      reg.general.bt_arb.set.prop_and_phaseseg1,
      reg.general.bt_arb.set.phaseseg2,
      reg.general.bt_arb.res.sp, // Sample Point in % of Bit Time
      reg.general.bt_arb.set.sjw, // SJW Length in TQ
      0, // SSP in % of Bit Time => not used because TDC = false
      false, // TDC disabled (false)
      'DrawingBTArb', // name of SVG element in HTML
      'Arbitration Phase' // label in Drawing
    ); 
  } else { // draw error message
    draw_svg.drawErrorMessage(
      'DrawingBTArb',
      'Arbitration Phase',
      'Missing parameters'
    );
  }

  // check if all input parameters are defined for calling drawBitTiming()
  if (reg.general && reg.general.bt_xldata && reg.general.bt_xldata.set && reg.general.bt_xldata.res &&
      reg.general.bt_global && reg.general.bt_global.set &&
      reg.general.bt_xldata.set.prop_and_phaseseg1 !== undefined &&
      reg.general.bt_xldata.set.phaseseg2 !== undefined &&
      reg.general.bt_xldata.res.sp !== undefined &&
      reg.general.bt_xldata.set.sjw !== undefined &&
      reg.general.bt_xldata.res.ssp !== undefined &&
      reg.general.bt_global.set.tdc !== undefined) {
    // Draw Bit Timing: XL Data Phase
    draw_svg.drawBitTiming(
      0,
      reg.general.bt_xldata.set.prop_and_phaseseg1,
      reg.general.bt_xldata.set.phaseseg2,
      reg.general.bt_xldata.res.sp, // Sample Point in % of Bit Time
      reg.general.bt_xldata.set.sjw, // SJW Length in TQ
      reg.general.bt_xldata.res.ssp, // SSP in % of Bit Time
      reg.general.bt_global.set.tdc, // TDC enabled (true) or disabled (false)
      'DrawingBTXLdata', // name of SVG element in HTML
      'XL Data Phase' // label in Drawing
    ); 
  } else { // draw error message
    draw_svg.drawErrorMessage(
      'DrawingBTXLdata',
      'XL Data Phase',
      'Missing parameters'
    );
  }

  if (reg.general && reg.general.bt_global && reg.general.bt_global.set &&
      reg.general.bt_xldata && reg.general.bt_xldata.set && reg.general.bt_xldata.res &&
      reg.general.bt_global.set.tms !== undefined && reg.general.bt_global.set.tms === true &&
      reg.general.bt_xldata.set.pwm_short !== undefined &&
      reg.general.bt_xldata.set.pwm_long !== undefined &&
      reg.general.bt_xldata.res.pwm_symbols_per_bit_time !== undefined) {
    draw_svg.drawPWMsymbols(
      reg.general.bt_xldata.set.pwm_short,
      reg.general.bt_xldata.set.pwm_long,
      reg.general.bt_xldata.res.pwm_symbols_per_bit_time,
      'DrawingBTXLdataPWM',
      'XL Data Phase PWM symbols');
  } else {
    // Draw PWM symbols with error message
    draw_svg.drawErrorMessage(
      'DrawingBTXLdataPWM',
      'XL Data Phase PWM symbols',
      'Missing parameters or TMS = off'
    );
  }

  // Legend for Bit Timing Drawings: adapt width to table width
  document.getElementById("DrawingBTLegend").style.width =   document.getElementById("BitTimingTable").offsetWidth + "px";
}

// ===================================================================================
// Assign HTML Parameters and Results from reg object
function assignHtmlParamsAndResults(reg, paramsHtml, resultsHtml) {
  // Assign clock frequency parameter: Not assigned because not printed in HTML
  // paramsHtml['par_clk_freq'] = reg.general.clk_freq;

  if (reg.general && reg.general.bt_global && reg.general.bt_global.set) {
    paramsHtml['par_tdc_dat'] = reg.general.bt_global.set.tdc !== undefined ? reg.general.bt_global.set.tdc : false; // TDC enabled or disabled
    paramsHtml['par_tms'] = reg.general.bt_global.set.tms !== undefined ? reg.general.bt_global.set.tms : false; // TMS enabled or disabled
  } else {
    // Default values if global settings are not set
    paramsHtml['par_tdc_dat'] = false; // TDC disabled by default 
    paramsHtml['par_tms'] = false; // TMS disabled by default
  }

  // Assign bit timing parameters from arbitration phase
  if (reg.general.bt_arb && reg.general.bt_arb.set) {
    paramsHtml['par_brp'] = reg.general.bt_arb.set.brp !== undefined ? reg.general.bt_arb.set.brp : 'no reg';
    paramsHtml['par_prop_and_phaseseg1_arb'] = reg.general.bt_arb.set.prop_and_phaseseg1 !== undefined ? reg.general.bt_arb.set.prop_and_phaseseg1 : 'no reg';
    paramsHtml['par_phaseseg2_arb'] = reg.general.bt_arb.set.phaseseg2 !== undefined ? reg.general.bt_arb.set.phaseseg2 : 'no reg';
    paramsHtml['par_sjw_arb'] = reg.general.bt_arb.set.sjw !== undefined ? reg.general.bt_arb.set.sjw : 'no reg';
  } else {
    // Default values if arbitration phase is not set
    paramsHtml['par_brp'] = 'no reg';
    paramsHtml['par_prop_and_phaseseg1_arb'] = 'no reg';
    paramsHtml['par_phaseseg2_arb'] = 'no reg';
    paramsHtml['par_sjw_arb'] = 'no reg';
  }

  // Assign bit timing parameters from XL data phase
  if (reg.general.bt_xldata && reg.general.bt_xldata.set) {
    paramsHtml['par_prop_and_phaseseg1_dat'] = reg.general.bt_xldata.set.prop_and_phaseseg1 !== undefined ? reg.general.bt_xldata.set.prop_and_phaseseg1 : 'no reg';
    paramsHtml['par_phaseseg2_dat'] = reg.general.bt_xldata.set.phaseseg2 !== undefined ? reg.general.bt_xldata.set.phaseseg2 : 'no reg';
    paramsHtml['par_sjw_dat'] = reg.general.bt_xldata.set.sjw !== undefined ? reg.general.bt_xldata.set.sjw : 'no reg';
    if (reg.general.bt_global.set.tms === true) {
      // TMS enabled, assign default value
      paramsHtml['par_sspoffset_dat'] = 'TMS on';
    } else if (reg.general.bt_global.set.tdc === true) {
      // TDC enabled, assign SSP offset
      paramsHtml['par_sspoffset_dat'] = reg.general.bt_xldata.set.ssp_offset !== undefined ? reg.general.bt_xldata.set.ssp_offset : 'no reg';
    } else {
      // TDC disabled, assign default value
      paramsHtml['par_sspoffset_dat'] = 'TDC off';
    }
  } else {
    // Default values if data phase is not set
    paramsHtml['par_prop_and_phaseseg1_dat'] = 'no reg';
    paramsHtml['par_phaseseg2_dat'] = 'no reg';
    paramsHtml['par_sjw_dat'] = 'no reg'; 
    paramsHtml['par_sspoffset_dat'] = 'no reg';
  }

  // Assign PWM parameters from XL data phase
  if (reg.general.bt_xldata && reg.general.bt_xldata.set && reg.general.bt_global.set.tms === true) {
    paramsHtml['par_pwmo'] = reg.general.bt_xldata.set.pwm_offset !== undefined ? reg.general.bt_xldata.set.pwm_offset : 'no reg';
    paramsHtml['par_pwms'] = reg.general.bt_xldata.set.pwm_short !== undefined ? reg.general.bt_xldata.set.pwm_short : 'no reg';
    paramsHtml['par_pwml'] = reg.general.bt_xldata.set.pwm_long !== undefined ? reg.general.bt_xldata.set.pwm_long : 'no reg';
  } else {
    paramsHtml['par_pwmo'] = 'TMS off';
    paramsHtml['par_pwms'] = 'TMS off';
    paramsHtml['par_pwml'] = 'TMS off';
  }

  // TODO: apply check, if reg.general.* is defined for each of the parametrs and results (e.g. ERR2 is displayed in HTML if XBTP is not parsed, see how it is done for PWM)

  // Assign clock results
  resultsHtml['res_clk_period'] = reg.general.clk_period;

  // Assign bit timing results from arbitration phase
  if (reg.general.bt_arb && reg.general.bt_arb.res) {
    resultsHtml['res_bitrate_arb'] = reg.general.bt_arb.res.bitrate !== undefined ? reg.general.bt_arb.res.bitrate : 'no reg';
    resultsHtml['res_sp_arb'] = reg.general.bt_arb.res.sp !== undefined ? reg.general.bt_arb.res.sp : 'no reg';
    resultsHtml['res_tqperbit_arb'] = reg.general.bt_arb.res.tq_per_bit !== undefined ? reg.general.bt_arb.res.tq_per_bit : 'no reg';
    resultsHtml['res_bitlength_arb'] = reg.general.bt_arb.res.bit_length !== undefined ? reg.general.bt_arb.res.bit_length : 'no reg';
    resultsHtml['res_tqlen'] = reg.general.bt_arb.res.tq_len !== undefined ? reg.general.bt_arb.res.tq_len : 'no reg';
  } else {
    // Default values if arbitration phase is not set
    resultsHtml['res_bitrate_arb'] = 'no reg';
    resultsHtml['res_sp_arb'] = 'no reg';
    resultsHtml['res_tqperbit_arb'] = 'no reg';
    resultsHtml['res_bitlength_arb'] = 'no reg';
    resultsHtml['res_tqlen'] = 'no reg';
  } 

  // Assign bit timing results from XL data phase
  if (reg.general.bt_xldata && reg.general.bt_xldata.res) {
    resultsHtml['res_bitrate_dat'] = reg.general.bt_xldata.res.bitrate !== undefined ? reg.general.bt_xldata.res.bitrate : 'no reg';
    resultsHtml['res_sp_dat'] = reg.general.bt_xldata.res.sp !== undefined ? reg.general.bt_xldata.res.sp : 'no reg';
    resultsHtml['res_ssp_dat'] = reg.general.bt_xldata.res.ssp !== undefined ? reg.general.bt_xldata.res.ssp : 'no reg';
    resultsHtml['res_tqperbit_dat'] = reg.general.bt_xldata.res.tq_per_bit !== undefined ? reg.general.bt_xldata.res.tq_per_bit : 'no reg';
    resultsHtml['res_bitlength_dat'] = reg.general.bt_xldata.res.bit_length !== undefined ? reg.general.bt_xldata.res.bit_length : 'no reg';
  } else {
    // Default values if data phase is not set
    resultsHtml['res_bitrate_dat'] = 'no reg';
    resultsHtml['res_sp_dat'] = 'no reg';
    resultsHtml['res_ssp_dat'] = 'no reg';
    resultsHtml['res_tqperbit_dat'] = 'no reg';
    resultsHtml['res_bitlength_dat'] = 'no reg';
  } 

  // Assign PWM results from XL data phase
  if (reg.general.bt_xldata && reg.general.bt_xldata.res && reg.general.bt_global.set.tms === true) {
    resultsHtml['res_pwm_symbol_len_ns'] = reg.general.bt_xldata.res.pwm_symbol_len_ns !== undefined ? reg.general.bt_xldata.res.pwm_symbol_len_ns : 'no reg';
    resultsHtml['res_pwm_symbol_len_clk_cycles'] = reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles !== undefined ? reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles : 'no reg';
    resultsHtml['res_pwm_symbols_per_bit_time'] = reg.general.bt_xldata.res.pwm_symbols_per_bit_time !== undefined ? reg.general.bt_xldata.res.pwm_symbols_per_bit_time : 'no reg';
  } else {
    // Default values if PWM is not set
    resultsHtml['res_pwm_symbol_len_ns'] = 'TMS off';
    resultsHtml['res_pwm_symbol_len_clk_cycles'] = 'TMS off';
    resultsHtml['res_pwm_symbols_per_bit_time'] = 'TMS off';
  }

  console.log('[Info] assignHtmlParamsAndResults(): Assigned parameters:', paramsHtml);
  console.log('[Info] assignHtmlParamsAndResults(): Assigned results:', resultsHtml);
}

// ===================================================================================
// Process User Register Values from Text Area - Updated main function
function processUserRegisterValues() {
  // Basic idea of this function:
  // 1. Parse user input from textarea into raw register array
  // 2. Process with the appropriate CAN IP Module function
  //    This function fills the content of the reg object with calculations
  // 3. Generate HTML objects from reg object
  // 4. Display data from params, results, reg in HTML fields and SVGs

  const paramsHtml = {}; // Initialize params object for HTML display
  const resultsHtml = {}; // Initialize results object for HTML display
  const reg = {}; // Initialize register object

  // Setup general section with clock frequency
  reg.general = {};
  reg.general.clk_freq = par_clk_freq_g;
  reg.general.clk_period = 1000/par_clk_freq_g; // 1000 / MHz = ns
  reg.general.report = []; // Initialize report array
  
  // generate report for CAN Clock
  reg.general.report.push({
      severityLevel: 4, // infoCalculated
      msg: `CAN Clock\nFrequency = ${par_clk_freq_g} MHz\nPeriod    = ${reg.general.clk_period} ns`
  });

  // get the text area content
  const userRegText = document.getElementById('userInputRegisterValues').value;
  
  // a) Step 1: Parse the text and generate raw register array
  parseUserRegisterValues(userRegText, reg);
  console.log('[Info] Step 1 - Parsed raw register values (reg.raw):', reg.raw);
  // Check for parsing errors
  if (reg.parse_output.hasErrors) {
    // Display all validation reports accumulated so far
    displayValidationReport(reg);
    return;
  }
 
  // Step 2: Process with CAN IP Module (X_CAN) - operates solely on reg object
  // Results are stored in reg.REGNAME.calc = {} without res_ prefix
  x_can.processRegsOfX_CAN(reg);

  // Step 3: Generate HTML objects from reg object (TODO: implement these functions)
  // generateParamsHtml(reg, paramsHtml);
  // generateResultsHtml(reg, resultsHtml);

  // Display in HTML =====================================
  // assign parameters and results to paramsHtml and resultsHtml objects (so they can be displayed in HTML later)
  assignHtmlParamsAndResults(reg, paramsHtml, resultsHtml);

  // display parameters in HTML fields
  displayParameters(paramsHtml);

  // Display calculation results in HTML fields
  displayResults(resultsHtml);

  // Display SVGs in HTML
  displaySVGs(reg); 

  // Display: Validation Reports in HTML textarea
  displayValidationReport(reg);
}