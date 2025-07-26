// X_CAN: Main script for processing CAN XL registers and calculating bit timing parameters
import { getBits } from './func_get_bits.js';

// ===================================================================================
// X_CAN: Process User Register Values: parse, validate, calculate results, generate report
export function processRegsOfX_CAN(reg, params, results, par_clk_freq_g) {
  // TODO: make this X_CAN related function clean

  // Map raw addresses to register names
  mapRawRegistersToNames(reg);
  console.log('[Info] Step 2 - Mapped register values (reg object):', reg);

  // c1) Process Bit Timing  registers
  procRegsBitTiming(params, reg, results, par_clk_freq_g);
  console.log('[Info] Registers with data and reports, reg object:', reg);
  console.log('[Info] Decoded params object:', params);
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
}

// ===================================================================================
// Map raw register addresses to register names and create named register structure
function mapRawRegistersToNames(reg) {
  // Check if parse_output exists (in reg object)
  if (!reg.parse_output) {
    console.warn('[X_CAN] [Warning, mapRawRegistersToNames()] reg.parse_output not found in reg object. Skipping mapping of <raw registers> to <names>. parseUserRegisterValues(userRegText, reg) must be called before this function.');
    return;
  }
  
  // Address to register name mapping based on x_can_prt.txt
  const addressMap = {
    0x00: { shortName: 'ENDN', longName: 'Endianness Test Register' },
    0x04: { shortName: 'PREL', longName: 'PRT Release Identification Register' },
    0x08: { shortName: 'STAT', longName: 'PRT Status Register' },
    0x20: { shortName: 'EVNT', longName: 'Event Status Flags Register' },
    0x40: { shortName: 'LOCK', longName: 'Unlock Sequence Register' },
    0x44: { shortName: 'CTRL', longName: 'Control Register' },
    0x48: { shortName: 'FIMC', longName: 'Fault Injection Module Control Register' },
    0x4C: { shortName: 'TEST', longName: 'Hardware Test functions Register' },
    0x60: { shortName: 'MODE', longName: 'Operating Mode Register' },
    0x64: { shortName: 'NBTP', longName: 'Arbitration Phase Nominal Bit Timing Register' },
    0x68: { shortName: 'DBTP', longName: 'CAN FD Data Phase Bit Timing Register' },
    0x6C: { shortName: 'XBTP', longName: 'XAN XL Data Phase Bit Timing Register' },
    0x70: { shortName: 'PCFG', longName: 'PWME Configuration Register' }
  };
  
  let mappedCount = 0;
  let unmappedCount = 0;
  
  // Process each raw register entry
  for (const rawReg of reg.raw) {
    const mapping = addressMap[rawReg.addr];
    
    if (mapping) {
      // Create named register structure
      const regName = mapping.shortName;
      reg[regName] = {
        int32: rawReg.value_int32,
        name_long: mapping.longName,
        addr: rawReg.addr
      };
      
      mappedCount++;
      
      reg.parse_output.report.push({
        severityLevel: 0, // info
        msg: `Mapped address 0x${rawReg.addr.toString(16).toUpperCase().padStart(2, '0')} to register ${regName} (${mapping.longName})`
      });
    } else {
      // Unknown address
      unmappedCount++;
      
      reg.parse_output.report.push({
        severityLevel: 2, // warning
        msg: `Unknown register address: 0x${rawReg.addr.toString(16).toUpperCase().padStart(2, '0')} - register will be ignored`
      });
      reg.parse_output.hasWarnings = true;
    }
  }
  
  // Add summary message
  reg.parse_output.report.push({
    severityLevel: 0, // info
    msg: `Address mapping completed: ${mappedCount} mapped, ${unmappedCount} unknown`
  });
  
  return reg;
} // end mapRawRegistersToNames

// ===================================================================================
// Process Nominal Bit Timing Register: Extract parameters, validate ranges, calculate results, generate report
export function procRegsBitTiming(params, reg, results, par_clk_freq_g) {

  // === MODE: Extract parameters from register ==========================
  if ('MODE' in reg && reg.MODE.int32 !== undefined) {
    const regValue = reg.MODE.int32;
    
    // 0. Extend existing register structure
    reg.MODE.fields = {};
    reg.MODE.report = []; // Initialize report array

    // 1. Decode all individual bits of MODE register
    reg.MODE.fields.TSSE = getBits(regValue, 13, 13);  // Transceiver Sharing Switch Enable
    reg.MODE.fields.LCHB = getBits(regValue, 12, 12);  // Light Commander High Bit Rate
    reg.MODE.fields.FIME = getBits(regValue, 11, 11);  // Fault Injection Module Enable
    reg.MODE.fields.EFDI = getBits(regValue, 10, 10);  // Error Flag/Frame Dissable
    reg.MODE.fields.XLTR = getBits(regValue, 9, 9);    // TMS Enable (XL Transceiver present)
    reg.MODE.fields.SFS  = getBits(regValue, 8, 8);    // Time Stamp Position: Start of Frame (1), End of Frame (0)
    reg.MODE.fields.RSTR = getBits(regValue, 7, 7);    // Restircted Mode Enable
    reg.MODE.fields.MON  = getBits(regValue, 6, 6);    // (Bus) Monitoring Mode Enable
    reg.MODE.fields.TXP  = getBits(regValue, 5, 5);    // TX Pause
    reg.MODE.fields.EFBI = getBits(regValue, 4, 4);    // Edge Filtering during Bus Integration
    reg.MODE.fields.PXHD = getBits(regValue, 3, 3);    // Protocol Exception Handling Disable
    reg.MODE.fields.TDCE = getBits(regValue, 2, 2);    // TDC: Transmitter Delay Compensation Enable
    reg.MODE.fields.XLOE = getBits(regValue, 1, 1);    // XL Operation Enable
    reg.MODE.fields.FDOE = getBits(regValue, 0, 0);    // FD Operation Enable
    
    // 2. Decode values needed for bit timing calculation
    params.par_tms = (reg.MODE.fields.XLTR === 1);
    params.par_tdc_dat = (reg.MODE.fields.TDCE === 1);

    // 3. Generete human-readable register report
    reg.MODE.report.push({
        severityLevel: 0, // info
        msg: `Register MODE: Operating Mode\n   [TSSE] Transceiver Sharing Switch Enable = ${reg.MODE.fields.TSSE}\n   [LCHB] FD Light Commander High Bit Rate Mode Enable = ${reg.MODE.fields.LCHB}\n   [FIME] Fault Injection Module Enable = ${reg.MODE.fields.FIME}\n   [EFDI] Error Flag/Frame Disable = ${reg.MODE.fields.EFDI}\n   [XLTR] TMS Enable (XL Transceiver present) = ${reg.MODE.fields.XLTR}\n   [SFS] Time Stamp Position: Start of Frame (1), End of Frame (0) = ${reg.MODE.fields.SFS}\n   [RSTR] Restricted Mode Enable = ${reg.MODE.fields.RSTR}\n   [MON] (Bus) Monitoring Mode Enable = ${reg.MODE.fields.MON}\n   [TXP] TX Pause = ${reg.MODE.fields.TXP}\n   [EFBI] Edge Filtering during Bus Integration = ${reg.MODE.fields.EFBI}\n   [PXHD] Protocol Exception Handling Disable = ${reg.MODE.fields.PXHD}\n   [TDCE] TDC: Transmitter Delay Compensation Enable = ${reg.MODE.fields.TDCE}\n   [XLOE] XL Operation Enable = ${reg.MODE.fields.XLOE}\n   [FDOE] FD Operation Enable = ${reg.MODE.fields.FDOE}`
    });
  }

  // === NBTP: Extract parameters from register ==========================
  if ('NBTP' in reg && reg.NBTP.int32 !== undefined) {
    const regValue = reg.NBTP.int32;

    // 0. Extend existing register structure
    reg.NBTP.fields = {};
    reg.NBTP.report = []; // Initialize report array

    // 1. Decode all individual bits of NBTP register
    reg.NBTP.fields.BRP    = getBits(regValue, 29, 25) + 1;  // Bit Rate Prescaler
    reg.NBTP.fields.NTSEG1 = getBits(regValue, 24, 16) + 1;  // Nominal Time Segment 1
    reg.NBTP.fields.NTSEG2 = getBits(regValue, 14, 8) + 1;   // Nominal Time Segment 2
    reg.NBTP.fields.NSJW   = getBits(regValue, 6, 0) + 1;    // Nominal Synchronization Jump Width

    // 2. Decode params needed for bit timing calculation
    params.par_brp = reg.NBTP.fields.BRP;
    params.par_prop_and_phaseseg1_arb = reg.NBTP.fields.NTSEG1;
    params.par_phaseseg2_arb = reg.NBTP.fields.NTSEG2;
    params.par_sjw_arb = reg.NBTP.fields.NSJW;

    // 3. Generete human-readable register report
    reg.NBTP.report.push({
        severityLevel: 0, // info
        msg: `Register NBTP: Arbitration Phase Nominal Bit Timing and Prescaler\n   [BRP] Bit Rate Prescaler = ${reg.NBTP.fields.BRP}\n   [NTSEG1] Nominal Time Segment 1 = ${reg.NBTP.fields.NTSEG1}\n   [NTSEG2] Nominal Time Segment 2 = ${reg.NBTP.fields.NTSEG2}\n   [NSJW] Nominal Synchronization Jump Width = ${reg.NBTP.fields.NSJW}`
    });

    // 4. calculate results
    results['res_tqlen']         = results.res_clk_period * params.par_brp;
    results['res_tqperbit_arb']  = 1 + params.par_prop_and_phaseseg1_arb + params.par_phaseseg2_arb;
    results['res_bitrate_arb']   = par_clk_freq_g / (params.par_brp * results.res_tqperbit_arb);
    results['res_bitlength_arb'] = 1000 / results.res_bitrate_arb;
    results['res_sp_arb']        = (1 - params.par_phaseseg2_arb/results.res_tqperbit_arb) * 100;
	
    // 5. Generate Report about settings
    reg.NBTP.report.push({
        severityLevel: 0, // info
        msg: `Nominal Bitrate (Arbitration Phase)\n   Bitrate = ${results.res_bitrate_arb} Mbit/s\n   Bit Length = ${results.res_bitlength_arb} ns\n   TQ per Bit = ${results.res_tqperbit_arb}, Sample Point = ${results.res_sp_arb}`
    });

    // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
    // TODO: check for phase segment length >= 2
  }

  // === DBTP: Extract parameters from register ==========================
  // TODO: implement DBTP register handling

  // === XBTP: Extract parameters from register ==========================
  if ('XBTP' in reg && reg.XBTP.int32 !== undefined) {
    const regValue = reg.XBTP.int32;

    // 0. Extend existing register structure
    reg.XBTP.fields = {};
    reg.XBTP.report = []; // Initialize report array

    // 1. Decode all individual bits of XBTP register
    reg.XBTP.fields.XTDCO  = getBits(regValue, 31, 24) + 1;  // XL Transmitter Delay Compensation Offset
    reg.XBTP.fields.XTSEG1 = getBits(regValue, 23, 16) + 1;  // XL Time Segment 1
    reg.XBTP.fields.XTSEG2 = getBits(regValue, 14, 8) + 1;   // XL Time Segment 2
    reg.XBTP.fields.XSJW   = getBits(regValue, 6, 0) + 1;    // XL Synchronization Jump Width
    
    // 2. Decode values needed for bit timing calculation
    params.par_sspoffset_dat = reg.XBTP.fields.XTDCO;
    params.par_prop_and_phaseseg1_dat = reg.XBTP.fields.XTSEG1;
    params.par_phaseseg2_dat = reg.XBTP.fields.XTSEG2;
    params.par_sjw_dat = reg.XBTP.fields.XSJW;

    // different output based on XLOE
    if (reg.MODE.fields.XLOE == 0) {
      // 3. Generete human-readable register report
      reg.XBTP.report.push({
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
      reg.XBTP.report.push({
          severityLevel: 0, // info
          msg: `Register XBTP: XL Data Phase Bit Timing\n   [XTDCO] XL Transmitter Delay Compensation Offset = ${reg.XBTP.fields.XTDCO}\n   [XTSEG1] XL Time Segment 1 = ${reg.XBTP.fields.XTSEG1}\n   [XTSEG2] XL Time Segment 2 = ${reg.XBTP.fields.XTSEG2}\n   [XSJW] XL Synchronization Jump Width = ${reg.XBTP.fields.XSJW}`
      });

      // 4. calculate results
      results['res_tqperbit_dat']  = 1 + params.par_prop_and_phaseseg1_dat + params.par_phaseseg2_dat;
      results['res_bitrate_dat']   = par_clk_freq_g / (params.par_brp * results.res_tqperbit_dat);
      results['res_bitlength_dat'] = 1000 / results.res_bitrate_dat;
      results['res_sp_dat']        = (1 - params.par_phaseseg2_dat/results.res_tqperbit_dat) * 100;

      // 5. Generate Report about settings
      // Register content
      reg.XBTP.report.push({
          severityLevel: 0, // info
          msg: `XL Data Phase Bitrate\n   Bitrate = ${results.res_bitrate_dat} Mbit/s\n   Bit Length = ${results.res_bitlength_dat} ns\n   TQ per Bit = ${results.res_tqperbit_dat}\n   Sample Point = ${results.res_sp_dat}`
      });

      // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
      // TODO: check for phase segment length >= 2

      // CAN Clock Frequency as recommended in CiA 612-1?
      if ((par_clk_freq_g != 160) && (par_clk_freq_g != 80)) {
        reg.XBTP.report.push({
          severityLevel: 2, // warning
          msg: `Recommended CAN Clock Frequency for CAN XL is 80 MHz or 160 MHz. Current value is ${par_clk_freq_g} MHz.`
        });
      }

      // Minimum number of TQ/Bit?
      if (results.res_tqperbit_dat < 8) {
        reg.XBTP.report.push({
          severityLevel: 2, // warning
          msg: `Recommended minimum TQ per XL Data Bit is 8. Current number of TQ per XL Data bit = ${results.res_tqperbit_dat}.`
        });
      }

      // Ratio of Arb. Bit Time / XL Data Bit Time >= 2 ?
      if (reg.MODE.fields.EFDI == 0) { // Error Signaling is enabled
        if (results.res_tqperbit_arb < (2 * results.res_tqperbit_dat)) {
          reg.XBTP.report.push({
            severityLevel: 3, // error
            msg: `Minimum Ratio of [XL Data Bitrate / Nominal Bitrate] = ${results.res_tqperbit_arb / results.res_tqperbit_dat}. Minimum ratio is 2, when Error Signaling is enabled (MODE.ESDI=0).`
          });
        }
      } // end if EFDI
    } // end if XLOE
    
  } // end if XBTP
  
  // === PCFG: Extract parameters from register (if TMS is enabled) ==============
  if ('PCFG' in reg && reg.PCFG.int32 !== undefined) {
    const regValue = reg.PCFG.int32;

    // 0. Extend existing register structure
    reg.PCFG.fields = {};
    reg.PCFG.report = []; // Initialize report array

    // 1. Decode all individual bits of PCFG register
    reg.PCFG.fields.PWMO = getBits(regValue, 21, 16);     // PWM Offset
    reg.PCFG.fields.PWML = getBits(regValue, 13, 8) + 1;  // PWM Low
    reg.PCFG.fields.PWMS = getBits(regValue, 5, 0) + 1;   // PWM Short

    // 2. Decode values needed for calculation (if TMS is enabled)
    params.par_pwmo = reg.PCFG.fields.PWMO;
    params.par_pwml = reg.PCFG.fields.PWML;
    params.par_pwms = reg.PCFG.fields.PWMS;

    // different output based on XLOE & TMS
    if ((reg.MODE.fields.XLOE == 0) || (reg.MODE.fields.XLTR == 0)) {
      // 3. Generete human-readable register report
      reg.PCFG.report.push({
        severityLevel: 2, // warning
        msg: `Register PCFG: PWME Configuration (PWM Symbols)\n   XL Operation (MODE.XLOE=0) OR Transceiver Mode Switch (MODE.XLTR=0) is disabled`
      });

      // 4. calculate results
      results['res_pwm_symbol_len_ns']         = 'OFF';
    	results['res_pwm_symbol_len_clk_cycles'] = 'OFF';   
    	results['res_pwm_symbols_per_bit_time']  = 'OFF';

    } else { // MODE.XLTR == 1
      // 3. Generete human-readable register report
      reg.PCFG.report.push({
          severityLevel: 0, // info
          msg: `Register PCFG: PWME Configuration (PWM Symbols)\n   [PWMO] PWM Offset = ${reg.PCFG.fields.PWMO}\n   [PWML] PWM phase Long = ${reg.PCFG.fields.PWML}\n   [PWMS] PWM phase Short = ${reg.PCFG.fields.PWMS}`
      });

      // 4. calculate results
      results['res_pwm_symbol_len_ns']         = (params.par_pwms + params.par_pwml) * results.res_clk_period;
	    results['res_pwm_symbol_len_clk_cycles'] = (params.par_pwms + params.par_pwml);
	    results['res_pwm_symbols_per_bit_time']  = (results.res_tqperbit_dat * params.par_brp) / results.res_pwm_symbol_len_clk_cycles;
      
      // 5. Generate Report about settings
      // Register content
      reg.PCFG.report.push({
          severityLevel: 0, // info
          msg: `PWM Configuration\n   PWM Symbol Length = ${results.res_pwm_symbol_len_ns} ns\n   PWM Symbol Length (clk cycles) = ${results.res_pwm_symbol_len_clk_cycles} clock cycles\n   PWM Symbols per XL Data Bit Time = ${results.res_pwm_symbols_per_bit_time}`
      });

      // Ratio of XL Data Bit Time to PWM Symbol Length
      if (!Number.isInteger(results.res_pwm_symbols_per_bit_time)) {
        reg.PCFG.report.push({
          severityLevel: 3, // error
          msg: `PWM Symbols per XL Data Bit Time (${results.res_pwm_symbols_per_bit_time.toFixed(2)}) is not an integer. Wrong PWM configuration.`
        });
      }

      // PWM Offset correctness
   		results['res_pwmo'] = (results.res_tqperbit_arb * params.par_brp) % results.res_pwm_symbol_len_clk_cycles;
      if (results.res_pwmo !== params.par_pwmo) {
        reg.PCFG.report.push({
          severityLevel: 3, // error
          msg: `PWM Offset (PCFG.PWMO = ${params.par_pwmo}) is wrong. Correct value is PCFG.PWMO = ${results.res_pwmo}`
        });
      }

    } // end if XLOE || XLTR

  } // end if PCFG

}
