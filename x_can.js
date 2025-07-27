// X_CAN: Main script for processing CAN XL registers and calculating bit timing parameters
import { getBits } from './func_get_bits.js';

// ===================================================================================
// X_CAN: Process User Register Values: parse, validate, calculate results, generate report
export function processRegsOfX_CAN(reg) {
  // TODO: make this X_CAN related function clean

  // Map raw addresses to register names
  mapRawRegistersToNames(reg);
  console.log('[Info] Step 2 - Mapped register values (reg object):', reg);

  // c1) Process Bit Timing registers
  procRegsBitTiming(reg);
  console.log('[Info] Registers with data and reports, reg object:', reg);

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
export function procRegsBitTiming(reg) {
  
  // Initialize bit timing structure in reg.general
  if (!reg.general.bt_global) {
    reg.general.bt_global = { set: {}, res: {} };
  }
  if (!reg.general.bt_arb) {
    reg.general.bt_arb = { set: {}, res: {} };
  }
  if (!reg.general.bt_fddata) {
    reg.general.bt_fddata = { set: {}, res: {} };
  }
  if (!reg.general.bt_xldata) {
    reg.general.bt_xldata = { set: {}, res: {} };
  }

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
    
    // 2. Store MODE-related bit timing settings in general structure
    reg.general.bt_global.set.tms = (reg.MODE.fields.XLTR === 1);
    reg.general.bt_global.set.tdc = (reg.MODE.fields.TDCE === 1);
    reg.general.bt_global.set.es  = (reg.MODE.fields.EFDI === 0); // Error Signaling Enable when EFDI=0

    // 3. Generate human-readable register report
    reg.MODE.report.push({
        severityLevel: 0, // info
        msg: `MODE: ${reg.MODE.name_long}\n[TSSE] Transceiver Sharing Switch Enable = ${reg.MODE.fields.TSSE}\n[LCHB] FD Light Commander High Bit Rate Mode Enable = ${reg.MODE.fields.LCHB}\n[FIME] Fault Injection Module Enable = ${reg.MODE.fields.FIME}\n[EFDI] Error Flag/Frame Disable = ${reg.MODE.fields.EFDI}\n[XLTR] TMS Enable (XL Transceiver present) = ${reg.MODE.fields.XLTR}\n[SFS] Time Stamp Position: Start of Frame (1), End of Frame (0) = ${reg.MODE.fields.SFS}\n[RSTR] Restricted Mode Enable = ${reg.MODE.fields.RSTR}\n[MON] (Bus) Monitoring Mode Enable = ${reg.MODE.fields.MON}\n[TXP] TX Pause = ${reg.MODE.fields.TXP}\n[EFBI] Edge Filtering during Bus Integration = ${reg.MODE.fields.EFBI}\n[PXHD] Protocol Exception Handling Disable = ${reg.MODE.fields.PXHD}\n[TDCE] TDC: Transmitter Delay Compensation Enable = ${reg.MODE.fields.TDCE}\n[XLOE] XL Operation Enable = ${reg.MODE.fields.XLOE}\n[FDOE] FD Operation Enable = ${reg.MODE.fields.FDOE}`
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

    // 2. Store NBTP bit timing settings in general structure
    reg.general.bt_arb.set.brp = reg.NBTP.fields.BRP;
    reg.general.bt_arb.set.prop_and_phaseseg1 = reg.NBTP.fields.NTSEG1;
    reg.general.bt_arb.set.phaseseg2 = reg.NBTP.fields.NTSEG2;
    reg.general.bt_arb.set.sjw = reg.NBTP.fields.NSJW;

    // 3. Generate human-readable register report
    reg.NBTP.report.push({
        severityLevel: 0, // info
        msg: `NBTP: ${reg.NBTP.name_long}\n[BRP] Bit Rate Prescaler = ${reg.NBTP.fields.BRP}\n[NTSEG1] Nominal Time Segment 1 = ${reg.NBTP.fields.NTSEG1}\n[NTSEG2] Nominal Time Segment 2 = ${reg.NBTP.fields.NTSEG2}\n[NSJW] Nominal Synchronization Jump Width = ${reg.NBTP.fields.NSJW}`
    });

    // 4. Calculate arbitration phase results and store in general structure
    reg.general.bt_arb.res.tq_len = reg.general.clk_period * reg.general.bt_arb.set.brp;
    reg.general.bt_arb.res.tq_per_bit = 1 + reg.general.bt_arb.set.prop_and_phaseseg1 + reg.general.bt_arb.set.phaseseg2;
    reg.general.bt_arb.res.bitrate = reg.general.clk_freq / (reg.general.bt_arb.set.brp * reg.general.bt_arb.res.tq_per_bit);
    reg.general.bt_arb.res.bit_length = 1000 / reg.general.bt_arb.res.bitrate;
    reg.general.bt_arb.res.sp = 100 - 100 * reg.general.bt_arb.set.phaseseg2 / reg.general.bt_arb.res.tq_per_bit;
    
    // 5. Generate Report about settings
    reg.NBTP.report.push({
        severityLevel: 4, // infoCalculated
        msg: `Nominal Bitrate (Arbitration Phase)\nBitrate    = ${reg.general.bt_arb.res.bitrate} Mbit/s\nBit Length = ${reg.general.bt_arb.res.bit_length} ns\nTQ per Bit = ${reg.general.bt_arb.res.tq_per_bit}\nSP         = ${reg.general.bt_arb.res.sp} %`
    });

    // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
    // TODO: check for phase segment length >= 2
  }

  // === DBTP: Extract parameters from register ==========================
  if ('DBTP' in reg && reg.DBTP.int32 !== undefined) {
    const regValue = reg.DBTP.int32;

    // 0. Extend existing register structure
    reg.DBTP.fields = {};
    reg.DBTP.report = []; // Initialize report array

    // 1. Decode all individual bits of DBTP register
    reg.DBTP.fields.DTDCO  = getBits(regValue, 31, 24);      // CAN FD Transmitter Delay Compensation Offset
    reg.DBTP.fields.DTSEG1 = getBits(regValue, 23, 16) + 1;  // CAN FD Data Time Segment 1
    reg.DBTP.fields.DTSEG2 = getBits(regValue, 14, 8) + 1;   // CAN FD Data Time Segment 2
    reg.DBTP.fields.DSJW   = getBits(regValue, 6, 0) + 1;    // CAN FD Data Synchronization Jump Width

    // 2. Store DBTP bit timing settings in general structure
    reg.general.bt_fddata.set.ssp_offset = reg.DBTP.fields.DTDCO;
    reg.general.bt_fddata.set.prop_and_phaseseg1 = reg.DBTP.fields.DTSEG1;
    reg.general.bt_fddata.set.phaseseg2 = reg.DBTP.fields.DTSEG2;
    reg.general.bt_fddata.set.sjw = reg.DBTP.fields.DSJW;

    // different output based on FDOE
    if (reg.MODE.fields.FDOE == 0) {
      // 3. Generate human-readable register report
      reg.DBTP.report.push({
        severityLevel: 2, // warning
        msg: `DBTP: ${reg.DBTP.name_long}\nFD Operation is disabled (MODE.FDOE=0)`
      });

      // 4. Set FD data phase results to OFF
      reg.general.bt_fddata.res.tq_per_bit = 'OFF';
      reg.general.bt_fddata.res.bitrate = 'OFF';
      reg.general.bt_fddata.res.bit_length = 'OFF';
      reg.general.bt_fddata.res.sp = 'OFF';
      reg.general.bt_fddata.res.ssp = 'OFF';

    } else { // MODE.FDOE == 1
      // 3. Generate human-readable register report
      reg.DBTP.report.push({
          severityLevel: 0, // info
          msg: `DBTP: ${reg.DBTP.name_long}\n[DTDCO] CAN FD Transmitter Delay Compensation Offset = ${reg.DBTP.fields.DTDCO}\n[DTSEG1] CAN FD Data Time Segment 1 = ${reg.DBTP.fields.DTSEG1}\n[DTSEG2] CAN FD Data Time Segment 2 = ${reg.DBTP.fields.DTSEG2}\n[DSJW] CAN FD Data Synchronization Jump Width = ${reg.DBTP.fields.DSJW}`
      });

      // 4. Calculate FD data phase results and store in general structure
      reg.general.bt_fddata.res.tq_per_bit = 1 + reg.general.bt_fddata.set.prop_and_phaseseg1 + reg.general.bt_fddata.set.phaseseg2;
      reg.general.bt_fddata.res.bitrate = reg.general.clk_freq / (reg.general.bt_arb.set.brp * reg.general.bt_fddata.res.tq_per_bit);
      reg.general.bt_fddata.res.bit_length = 1000 / reg.general.bt_fddata.res.bitrate;
      reg.general.bt_fddata.res.sp = 100 - 100 * reg.general.bt_fddata.set.phaseseg2 / reg.general.bt_fddata.res.tq_per_bit;
      
      // Calculate SSP (Secondary Sample Point) if TDC is enabled
      if (reg.general.bt_global.set.tdc === true) {
        reg.general.bt_fddata.res.ssp = 100 - 100*reg.general.bt_fddata.set.ssp_offset/reg.general.bt_fddata.res.tq_per_bit;
      } else {
        reg.general.bt_fddata.res.ssp = 0; // SSP not used when TDC disabled
      }

      // 5. Generate Report about settings
      reg.DBTP.report.push({
          severityLevel: 4, // infoCalculated
          msg: `CAN FD Data Phase Bitrate\nBitrate    = ${reg.general.bt_fddata.res.bitrate} Mbit/s\nBit Length = ${reg.general.bt_fddata.res.bit_length} ns\nTQ per Bit = ${reg.general.bt_fddata.res.tq_per_bit}\nSP         = ${reg.general.bt_fddata.res.sp} %\nSSP        = ${reg.general.bt_fddata.res.ssp} %`
      });

      // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
      // TODO: check for phase segment length >= 2

      // Minimum number of TQ/Bit?
      if (reg.general.bt_fddata.res.tq_per_bit < 5) {
        reg.DBTP.report.push({
          severityLevel: 2, // warning
          msg: `Recommended minimum TQ per FD Data Bit is 5. Current number of TQ per FD Data bit = ${reg.general.bt_fddata.res.tq_per_bit}.`
        });
      }

      // Ratio of Arb. Bit Time / FD Data Bit Time >= 2 ?
      if (reg.MODE.fields.EFDI == 0) { // Error Signaling is enabled
        if (reg.general.bt_arb.res.tq_per_bit < (2 * reg.general.bt_fddata.res.tq_per_bit)) {
          reg.DBTP.report.push({
            severityLevel: 3, // error
            msg: `Minimum Ratio of [FD Data Bitrate / Nominal Bitrate] = ${reg.general.bt_arb.res.tq_per_bit / reg.general.bt_fddata.res.tq_per_bit}. Minimum ratio is 2, when Error Signaling is enabled (MODE.ESDI=0).`
          });
        }
      } // end if EFDI
    } // end if FDOE
    
  } // end if DBTP

  // === XBTP: Extract parameters from register ==========================
  if ('XBTP' in reg && reg.XBTP.int32 !== undefined) {
    const regValue = reg.XBTP.int32;

    // 0. Extend existing register structure
    reg.XBTP.fields = {};
    reg.XBTP.report = []; // Initialize report array

    // 1. Decode all individual bits of XBTP register
    reg.XBTP.fields.XTDCO  = getBits(regValue, 31, 24);      // XL Transmitter Delay Compensation Offset
    reg.XBTP.fields.XTSEG1 = getBits(regValue, 23, 16) + 1;  // XL Time Segment 1
    reg.XBTP.fields.XTSEG2 = getBits(regValue, 14, 8) + 1;   // XL Time Segment 2
    reg.XBTP.fields.XSJW   = getBits(regValue, 6, 0) + 1;    // XL Synchronization Jump Width
    
    // 2. Store XBTP bit timing settings in general structure
    reg.general.bt_xldata.set.ssp_offset = reg.XBTP.fields.XTDCO;
    reg.general.bt_xldata.set.prop_and_phaseseg1 = reg.XBTP.fields.XTSEG1;
    reg.general.bt_xldata.set.phaseseg2 = reg.XBTP.fields.XTSEG2;
    reg.general.bt_xldata.set.sjw = reg.XBTP.fields.XSJW;

    // different output based on XLOE
    if (reg.MODE.fields.XLOE == 0) {
      // 3. Generate human-readable register report
      reg.XBTP.report.push({
        severityLevel: 2, // warning
        msg: `XBTP: ${reg.XBTP.name_long}\nXL Operation is disabled (MODE.XLOE=0)`
      });

      // 4. Set XL data phase results to OFF
      reg.general.bt_xldata.res.tq_per_bit = 'OFF';
      reg.general.bt_xldata.res.bitrate = 'OFF';
      reg.general.bt_xldata.res.bit_length = 'OFF';
      reg.general.bt_xldata.res.sp = 'OFF';
      reg.general.bt_xldata.res.ssp = 'OFF';

    } else { // MODE.XLOE == 1
      // 3. Generate human-readable register report
      reg.XBTP.report.push({
          severityLevel: 0, // info
          msg: `XBTP: ${reg.XBTP.name_long}\n[XTDCO] XL Transmitter Delay Compensation Offset = ${reg.XBTP.fields.XTDCO}\n[XTSEG1] XL Time Segment 1 = ${reg.XBTP.fields.XTSEG1}\n[XTSEG2] XL Time Segment 2 = ${reg.XBTP.fields.XTSEG2}\n[XSJW] XL Synchronization Jump Width = ${reg.XBTP.fields.XSJW}`
      });

      // 4. Calculate XL data phase results and store in general structure
      reg.general.bt_xldata.res.tq_per_bit = 1 + reg.general.bt_xldata.set.prop_and_phaseseg1 + reg.general.bt_xldata.set.phaseseg2;
      reg.general.bt_xldata.res.bitrate = reg.general.clk_freq / (reg.general.bt_arb.set.brp * reg.general.bt_xldata.res.tq_per_bit);
      reg.general.bt_xldata.res.bit_length = 1000 / reg.general.bt_xldata.res.bitrate;
      reg.general.bt_xldata.res.sp = 100 - 100 * reg.general.bt_xldata.set.phaseseg2 / reg.general.bt_xldata.res.tq_per_bit;
      
      // Calculate SSP (Secondary Sample Point) if TDC is enabled
      if (reg.general.bt_global.set.tdc === true) {
        reg.general.bt_xldata.res.ssp = 100 - 100*reg.general.bt_xldata.set.ssp_offset/reg.general.bt_xldata.res.tq_per_bit;
      } else {
        reg.general.bt_xldata.res.ssp = 0; // SSP not used when TDC disabled
      }

      // 5. Generate Report about settings
      reg.XBTP.report.push({
          severityLevel: 4, // infoCalculated
          msg: `XL Data Phase Bitrate\nBitrate    = ${reg.general.bt_xldata.res.bitrate} Mbit/s\nBit Length = ${reg.general.bt_xldata.res.bit_length} ns\nTQ per Bit = ${reg.general.bt_xldata.res.tq_per_bit}\nSP         = ${reg.general.bt_xldata.res.sp} %\nSSP        = ${reg.general.bt_xldata.res.ssp} %`
      });

      // TODO: check for SJW <= min(PhaseSeg1, PhaseSeg2)
      // TODO: check for phase segment length >= 2

      // CAN Clock Frequency as recommended in CiA 612-1?
      if ((reg.general.clk_freq != 160) && (reg.general.clk_freq != 80)) {
        reg.XBTP.report.push({
          severityLevel: 2, // warning
          msg: `Recommended CAN Clock Frequency for CAN XL is 80 MHz or 160 MHz. Current value is ${reg.general.clk_freq} MHz.`
        });
      }

      // Minimum number of TQ/Bit?
      if (reg.general.bt_xldata.res.tq_per_bit < 8) {
        reg.XBTP.report.push({
          severityLevel: 2, // warning
          msg: `Recommended minimum TQ per XL Data Bit is 8. Current number of TQ per XL Data bit = ${reg.general.bt_xldata.res.tq_per_bit}.`
        });
      }

      // Ratio of Arb. Bit Time / XL Data Bit Time >= 2 ?
      if (reg.MODE.fields.EFDI == 0) { // Error Signaling is enabled
        if (reg.general.bt_arb.res.tq_per_bit < (2 * reg.general.bt_xldata.res.tq_per_bit)) {
          reg.XBTP.report.push({
            severityLevel: 3, // error
            msg: `Minimum Ratio of [XL Data Bitrate / Nominal Bitrate] = ${reg.general.bt_arb.res.tq_per_bit / reg.general.bt_xldata.res.tq_per_bit}. Minimum ratio is 2, when Error Signaling is enabled (MODE.ESDI=0).`
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

    // 2. Store PWM settings in XL data structure
    reg.general.bt_xldata.set.pwm_offset = reg.PCFG.fields.PWMO;
    reg.general.bt_xldata.set.pwm_long = reg.PCFG.fields.PWML;
    reg.general.bt_xldata.set.pwm_short = reg.PCFG.fields.PWMS;

    // different output based on XLOE & TMS
    if ((reg.MODE.fields.XLOE == 0) || (reg.MODE.fields.XLTR == 0)) {
      // 3. Generate human-readable register report
      reg.PCFG.report.push({
        severityLevel: 2, // warning
        msg: `PCFG: ${reg.PCFG.name_long}\nXL Operation (MODE.XLOE=0) OR Transceiver Mode Switch (MODE.XLTR=0) is disabled`
      });

      // 4. Set PWM results to OFF
      reg.general.bt_xldata.res.pwm_symbol_len_ns = 'OFF';
      reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles = 'OFF';   
      reg.general.bt_xldata.res.pwm_symbols_per_bit_time = 'OFF';

    } else { // MODE.XLTR == 1 && MODE.XLOE == 1
      // 3. Generate human-readable register report
      reg.PCFG.report.push({
          severityLevel: 0, // info
          msg: `PCFG: ${reg.PCFG.name_long}\n[PWMO] PWM Offset = ${reg.PCFG.fields.PWMO}\n[PWML] PWM phase Long = ${reg.PCFG.fields.PWML}\n[PWMS] PWM phase Short = ${reg.PCFG.fields.PWMS}`
      });

      // 4. Calculate PWM results and store in XL data structure
      reg.general.bt_xldata.res.pwm_symbol_len_ns = (reg.general.bt_xldata.set.pwm_short + reg.general.bt_xldata.set.pwm_long) * reg.general.clk_period;
      reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles = (reg.general.bt_xldata.set.pwm_short + reg.general.bt_xldata.set.pwm_long);
      reg.general.bt_xldata.res.pwm_symbols_per_bit_time = (reg.general.bt_xldata.res.tq_per_bit * reg.general.bt_arb.set.brp) / reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles;
      
      // 5. Generate Report about settings
      reg.PCFG.report.push({
          severityLevel: 4, // infoCalculated
          msg: `PWM Configuration\nPWM Symbol Length = ${reg.general.bt_xldata.res.pwm_symbol_len_ns} ns = ${reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles} clock cycles\nPWM Symbols per XL Data Bit Time = ${reg.general.bt_xldata.res.pwm_symbols_per_bit_time}`
      });

      // Ratio of XL Data Bit Time to PWM Symbol Length
      if (!Number.isInteger(reg.general.bt_xldata.res.pwm_symbols_per_bit_time)) {
        reg.PCFG.report.push({
          severityLevel: 3, // error
          msg: `PWM Symbols per XL Data Bit Time (${reg.general.bt_xldata.res.pwm_symbols_per_bit_time.toFixed(2)}) is not an integer. Wrong PWM configuration.`
        });
      }

      // PWM Offset correctness
      const pwmo_calculated = (reg.general.bt_arb.res.tq_per_bit * reg.general.bt_arb.set.brp) % reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles;
      if (pwmo_calculated !== reg.general.bt_xldata.set.pwm_offset) {
        reg.PCFG.report.push({
          severityLevel: 3, // error
          msg: `PWM Offset (PCFG.PWMO = ${reg.general.bt_xldata.set.pwm_offset}) is wrong. Correct value is PCFG.PWMO = ${pwmo_calculated}`
        });
      }

    } // end if XLOE || XLTR

  } // end if PCFG

}
