// X_CAN: Main script for processing CAN XL registers and calculating bit timing parameters
import { getBits } from './help_functions.js';
import { sevC } from './help_functions.js';

// TODO: rename to X_CAN PRT
// ===================================================================================
// X_CAN: Process User Register Values: parse, validate, calculate results, generate report
export function processRegsOfX_CAN_PRT(reg) {
  // Map raw addresses to register names
  mapRawRegistersToNames(reg);
  console.log('[Info] Step 2 - Mapped register values (reg object):', reg);

  // c1) Process Bit Timing registers
  procRegsPrtBitTiming(reg);
  
  // c2) Process Other PRT registers
  procRegsPrtOther(reg);
  // TODO: prepare proper testdata with all registers
  // TODO: test the new function => seems to have some halucinations

  console.log('[Info] Registers with data and reports, reg object:', reg);
}

// ==================================================================================
// Example Register Values for X_CAN PRT
export function loadExampleRegisterValues() {
  const clock = 160;
  const registerString = `# X_CAN PRT example register values
# Format to use: 0xADDR 0xVALUE
# 0xADDR is relative X_CAN PRT address
0x000 0x87654321
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

return {exampleRegisterValues: registerString, clockFrequency: clock};
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
        severityLevel: sevC.Info, // info
        msg: `Mapped reg. address 0x${rawReg.addr.toString(16).toUpperCase().padStart(3, '0')} to ${regName} (${mapping.longName})`
      });
    } else {
      // Unknown address
      unmappedCount++;
      
      reg.parse_output.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `Unknown register address: 0x${rawReg.addr.toString(16).toUpperCase().padStart(3, '0')} - register will be ignored`
      });
      reg.parse_output.hasWarnings = true;
    }
  }
  
  // Add summary message
  reg.parse_output.report.push({
    severityLevel: sevC.Info, // info
    msg: `Address mapping completed: ${mappedCount} mapped, ${unmappedCount} unknown`
  });
  
  return reg;
} // end mapRawRegistersToNames

// ===================================================================================
// Process Nominal Bit Timing Register: Extract parameters, validate ranges, calculate results, generate report
function procRegsPrtBitTiming(reg) {

  // Initialize bit timing structure in reg.general
  if (!reg.general.bt_global) {
    reg.general.bt_global = { set: {}, res: {} };
  }
  // Initialize bit timing structure in reg.general
  if (!reg.general.bt_arb) {
    reg.general.bt_arb = { set: {}, res: {} };
  }
  // Initialize bit timing structure in reg.general
  if (!reg.general.bt_fddata) {
    reg.general.bt_fddata = { set: {}, res: {} };
  }
  // Initialize bit timing structure in reg.general
  if (!reg.general.bt_xldata) {
    reg.general.bt_xldata = { set: {}, res: {} };
  }

  // Rule: only assign reg.general.* values if they get meaningful values
  //       leave values undefined, if a) according registers are not present
  //                                  b) configuration disables a feature (e.g. TMS=OFF => then do not provide PWM settings & results)

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
    reg.general.bt_global.set.fd  = (reg.MODE.fields.FDOE === 1 && reg.general.bt_global.set.es === true && reg.general.bt_global.set.tms === false); // FD Operation Enable when FDOE=1
    reg.general.bt_global.set.xl  = (reg.MODE.fields.XLOE === 1); // XL Operation Enable when XLOE=1

    // 3. Generate human-readable register report
  reg.MODE.report.push({
    severityLevel: sevC.Info, // info
        msg: `MODE: ${reg.MODE.name_long} (0x${reg.MODE.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[TSSE] Transceiver Sharing Switch Enable            = ${reg.MODE.fields.TSSE}\n` +
             `[LCHB] FD Light Commander High Bit Rate Mode Enable = ${reg.MODE.fields.LCHB}\n` +
             `[FIME] Fault Injection Module Enable                = ${reg.MODE.fields.FIME}\n` +
             `[EFDI] Error Flag/Frame Disable                     = ${reg.MODE.fields.EFDI}\n` +
             `[XLTR] Transceiver Mode Switching (TMS) Enable      = ${reg.MODE.fields.XLTR}\n` +
             `[SFS ] Time Stamp Position: SOF(1), EOF(0)          = ${reg.MODE.fields.SFS}\n` +
             `[RSTR] Restricted Mode Enable                       = ${reg.MODE.fields.RSTR}\n` +
             `[MON ] (Bus) Monitoring Mode Enable                 = ${reg.MODE.fields.MON}\n` +
             `[TXP ] TX Pause                                     = ${reg.MODE.fields.TXP}\n` +
             `[EFBI] Edge Filtering during Bus Integration        = ${reg.MODE.fields.EFBI}\n` +
             `[PXHD] Protocol Exception Handling Disable          = ${reg.MODE.fields.PXHD}\n` +
             `[TDCE] Transmitter Delay Compensation (TDC) Enable  = ${reg.MODE.fields.TDCE}\n` +
             `[XLOE] XL Operation Enable                          = ${reg.MODE.fields.XLOE}\n` +
             `[FDOE] FD Operation Enable                          = ${reg.MODE.fields.FDOE}`
    });

    // Check: FDOE is set when XLOE is also set
    if (reg.MODE.fields.FDOE === 0 && reg.MODE.fields.XLOE === 1) {
      reg.MODE.report.push({
        severityLevel: sevC.Error, // error
        msg: `MODE: FDOE (${reg.MODE.fields.FDOE}) is not set when XLOE (${reg.MODE.fields.XLOE}) is set. FDOE must be set to 1 when XLOE is set to 1.`
      });
    }

    // Check: TMS=1 while ES=0
    if (reg.MODE.fields.XLTR === 1 && reg.MODE.fields.EFDI === 0) {
      reg.MODE.report.push({
        severityLevel: sevC.Error, // error
        msg: `MODE: TMS=ON while ES=OFF. This is not supported by X_CAN. XLTR (${reg.MODE.fields.XLTR}), EFDI (${reg.MODE.fields.EFDI})`
      });
    }
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
    severityLevel: sevC.Info, // info
        msg: `NBTP: ${reg.NBTP.name_long} (0x${reg.NBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[BRP   ] Bit Rate Prescaler     = ${reg.NBTP.fields.BRP}\n` +
             `[NTSEG1] Nominal Time Segment 1 = ${reg.NBTP.fields.NTSEG1}\n` +
             `[NTSEG2] Nominal Time Segment 2 = ${reg.NBTP.fields.NTSEG2}\n` +
             `[NSJW  ] Nominal SJW            = ${reg.NBTP.fields.NSJW}`
    });

    // 4. Calculate arbitration phase results and store in general structure
    reg.general.bt_arb.res.tq_len = reg.general.clk_period * reg.general.bt_arb.set.brp;
    reg.general.bt_arb.res.tq_per_bit = 1 + reg.general.bt_arb.set.prop_and_phaseseg1 + reg.general.bt_arb.set.phaseseg2;
    reg.general.bt_arb.res.bitrate = reg.general.clk_freq / (reg.general.bt_arb.set.brp * reg.general.bt_arb.res.tq_per_bit);
    reg.general.bt_arb.res.bit_length = 1000 / reg.general.bt_arb.res.bitrate;
    reg.general.bt_arb.res.sp = 100 - 100 * reg.general.bt_arb.set.phaseseg2 / reg.general.bt_arb.res.tq_per_bit;
    
    // 5. Generate Report about settings
  reg.NBTP.report.push({
    severityLevel: sevC.InfoCalc, // infoCalculated
        msg: `Nominal Bitrate (Arbitration Phase)\n` +
             `Bitrate    = ${reg.general.bt_arb.res.bitrate} Mbit/s\n` +
             `Bit Length = ${reg.general.bt_arb.res.bit_length} ns\n` +
             `TQ per Bit = ${reg.general.bt_arb.res.tq_per_bit}\n` +
             `SP         = ${reg.general.bt_arb.res.sp} %`
    });

    // Check: check for SJW <= min(PhaseSeg1, PhaseSeg2)?
    if (reg.general.bt_arb.set.sjw > reg.general.bt_arb.set.phaseseg2) {
      reg.NBTP.report.push({
        severityLevel: sevC.Error, // error
        msg: `NBTP: SJW (${reg.general.bt_arb.set.sjw}) > PhaseSeg2 (${reg.general.bt_arb.set.phaseseg2}). ISO 11898-1 requires SJW <= PhaseSeg2.`
      });
    }

    // Check: check for PhaseSeg2 >= 2
    if (reg.general.bt_arb.set.phaseseg2 < 2) {
      reg.NBTP.report.push({
        severityLevel: sevC.Error, // error
        msg: `NBTP: PhaseSeg2 (${reg.general.bt_arb.set.phaseseg2}) < 2. ISO 11898-1 requires a value >= 2.`
      });
    }

    // Check: SJW choosen as large as possible?
    if (reg.general.bt_arb.set.sjw < reg.general.bt_arb.set.phaseseg2) {
      reg.NBTP.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `NBTP: SJW (${reg.general.bt_arb.set.sjw}) < PhaseSeg2 (${reg.general.bt_arb.set.phaseseg2}). It is recommended to use SJW=PhaseSeg2.`
      });
    }

    // Check: Number of TQ large enough?
    if (reg.general.bt_arb.res.tq_per_bit < 8) {
      reg.NBTP.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `NBTP: Number of TQ/Bit is small. If possible, increase the TQ/Bit by reducing BRP or increasing the CAN Clock Freq.`
      });
    }
  } // end if NBTP

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
    // TODO: move storage of global parameters into area after check "FD enabled"
    // 2. Store DBTP bit timing settings in general structure
    reg.general.bt_fddata.set.ssp_offset = reg.DBTP.fields.DTDCO;
    reg.general.bt_fddata.set.prop_and_phaseseg1 = reg.DBTP.fields.DTSEG1;
    reg.general.bt_fddata.set.phaseseg2 = reg.DBTP.fields.DTSEG2;
    reg.general.bt_fddata.set.sjw = reg.DBTP.fields.DSJW;
    // set brp (as a copy of arb)
    reg.general.bt_fddata.set.brp = reg.general.bt_arb.set.brp !== undefined ? reg.general.bt_arb.set.brp : 0; // X_CAN uses same BRP as in arbitration phase

    // different output based on FD enabled yes/no
    if (reg.general.bt_global.set.fd !== undefined && reg.general.bt_global.set.fd === false) {
      // 3. Generate human-readable register report
      reg.DBTP.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `DBTP: ${reg.DBTP.name_long} (0x${reg.DBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `FD Operation is disabled: a) MODE.FDOE=0 OR b) TMS=ON or ES=OFF OR c) MODE register not present`
      });

    } else { // FD enabled (or MODE register not present)
      // 3. Generate human-readable register report
      reg.DBTP.report.push({
        severityLevel: sevC.Info, // info
          msg: `DBTP: ${reg.DBTP.name_long} (0x${reg.DBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
               `[DTDCO ] FD TDC Offset     = ${reg.DBTP.fields.DTDCO}\n` +
               `[DTSEG1] FD Time Segment 1 = ${reg.DBTP.fields.DTSEG1}\n` +
               `[DTSEG2] FD Time Segment 2 = ${reg.DBTP.fields.DTSEG2}\n` +
               `[DSJW  ] FD SJW            = ${reg.DBTP.fields.DSJW}`
        });

      // 4. Calculate FD data phase results and store in general structure
      reg.general.bt_fddata.res.tq_len = reg.general.clk_period * reg.general.bt_fddata.set.brp;
      reg.general.bt_fddata.res.tq_per_bit = 1 + reg.general.bt_fddata.set.prop_and_phaseseg1 + reg.general.bt_fddata.set.phaseseg2;
      reg.general.bt_fddata.res.bitrate = reg.general.clk_freq / (reg.general.bt_fddata.set.brp * reg.general.bt_fddata.res.tq_per_bit);
      reg.general.bt_fddata.res.bit_length = 1000 / reg.general.bt_fddata.res.bitrate;
      reg.general.bt_fddata.res.sp = 100 - 100 * reg.general.bt_fddata.set.phaseseg2 / reg.general.bt_fddata.res.tq_per_bit;
      
      // Calculate SSP (Secondary Sample Point) if TDC is enabled
      if (reg.general.bt_global.set.tdc === true) {
        reg.general.bt_fddata.res.ssp = 100*reg.general.bt_fddata.set.ssp_offset/reg.general.bt_fddata.res.tq_per_bit;
      } else {
        reg.general.bt_fddata.res.ssp = 0; // SSP not used when TDC disabled
      }

      // 5. Generate Report about settings
    reg.DBTP.report.push({
      severityLevel: sevC.InfoCalc, // infoCalculated
          msg: `CAN FD Data Phase Bitrate\n` +
               `Bitrate    = ${reg.general.bt_fddata.res.bitrate} Mbit/s\n` +
               `Bit Length = ${reg.general.bt_fddata.res.bit_length} ns\n` +
               `TQ per Bit = ${reg.general.bt_fddata.res.tq_per_bit}\n` +
               `SP         = ${reg.general.bt_fddata.res.sp} %\n` +
               `SSP        = ${reg.general.bt_fddata.res.ssp} %`
      });

      // Check: CAN Clock Frequency as recommended in CiA 601-3?
      if ((reg.general.clk_freq != 160) && (reg.general.clk_freq != 80) && (reg.general.clk_freq != 40) && (reg.general.clk_freq != 20)) {
        reg.DBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `CAN FD: Recommended CAN Clock Frequency is 20, 40, 80 MHz etc. (see CiA 601-3). Current value is ${reg.general.clk_freq} MHz.`
        });
      }

      // Check: check for SJW <= min(PhaseSeg1, PhaseSeg2)?
      if (reg.general.bt_fddata.set.sjw > reg.general.bt_fddata.set.phaseseg2) {
        reg.DBTP.report.push({
          severityLevel: sevC.Error, // error
          msg: `DBTP: SJW (${reg.general.bt_fddata.set.sjw}) > PhaseSeg2 (${reg.general.bt_fddata.set.phaseseg2}). ISO 11898-1 requires SJW <= PhaseSeg2.`
        });
      }

      // Check: check for PhaseSeg2 >= 2
      if (reg.general.bt_fddata.set.phaseseg2 < 2) {
        reg.DBTP.report.push({
          severityLevel: sevC.Error, // error
          msg: `DBTP: PhaseSeg2 (${reg.general.bt_fddata.set.phaseseg2}) < 2. ISO 11898-1 requires a value >= 2.`
        });
      }

      // Check: SJW choosen as large as possible?
      if (reg.general.bt_fddata.set.sjw < reg.general.bt_fddata.set.phaseseg2) {
        reg.DBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `DBTP: SJW (${reg.general.bt_fddata.set.sjw}) < PhaseSeg2 (${reg.general.bt_fddata.set.phaseseg2}). It is recommended to use SJW=PhaseSeg2.`
        });
      }

      // Check: Number of TQ large enough?
      if (reg.general.bt_fddata.res.tq_per_bit < 8) {
        reg.DBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `DBTP: Number of TQ/Bit is small. If possible, increase the TQ/Bit by reducing BRP or increasing the CAN Clock Freq.`
        });
      }
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
    // set brp (as a copy of arb)
    reg.general.bt_xldata.set.brp = reg.general.bt_arb.set.brp !== undefined ? reg.general.bt_arb.set.brp : 0; // X_CAN uses same BRP as in arbitration phase

    // different output based on XL enabled yes/no
    if (reg.general.bt_global.set.xl !== undefined && reg.general.bt_global.set.xl === false) {
      // 3. Generate human-readable register report
      reg.XBTP.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `XBTP: ${reg.XBTP.name_long} (0x${reg.XBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `XL Operation is disabled (MODE.XLOE=0) OR MODE register not present`
      });

    } else { // XL enabled (or MODE register not present)
      // 3. Generate human-readable register report
    reg.XBTP.report.push({
      severityLevel: sevC.Info, // info
          msg: `XBTP: ${reg.XBTP.name_long} (0x${reg.XBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
               `[XTDCO ] XL TDC Offset     = ${reg.XBTP.fields.XTDCO}\n` +
               `[XTSEG1] XL Time Segment 1 = ${reg.XBTP.fields.XTSEG1}\n` +
               `[XTSEG2] XL Time Segment 2 = ${reg.XBTP.fields.XTSEG2}\n` +
               `[XSJW  ] XL SJW            = ${reg.XBTP.fields.XSJW}`
      });

      // 4. Calculate XL data phase results and store in general structure
      reg.general.bt_xldata.res.tq_len = reg.general.clk_period * reg.general.bt_xldata.set.brp;
      reg.general.bt_xldata.res.tq_per_bit = 1 + reg.general.bt_xldata.set.prop_and_phaseseg1 + reg.general.bt_xldata.set.phaseseg2;
      reg.general.bt_xldata.res.bitrate = reg.general.clk_freq / (reg.general.bt_xldata.set.brp * reg.general.bt_xldata.res.tq_per_bit);
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
      severityLevel: sevC.InfoCalc, // infoCalculated
          msg: `XL Data Phase Bitrate\n` +
               `Bitrate    = ${reg.general.bt_xldata.res.bitrate} Mbit/s\n` +
               `Bit Length = ${reg.general.bt_xldata.res.bit_length} ns\n` +
               `TQ per Bit = ${reg.general.bt_xldata.res.tq_per_bit}\n` +
               `SP         = ${reg.general.bt_xldata.res.sp} %\n` +
               `SSP        = ${reg.general.bt_xldata.res.ssp} %`
      });

      // Check: CAN Clock Frequency as recommended in CiA 612-1?
      if ((reg.general.clk_freq != 160) && (reg.general.clk_freq != 80)) {
        reg.XBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `CAN XL: Recommended CAN Clock Frequency is 80 MHz or 160 MHz. Current value is ${reg.general.clk_freq} MHz.`
        });
      }

      // Check: check for SJW <= min(PhaseSeg1, PhaseSeg2)?
      if (reg.general.bt_xldata.set.sjw > reg.general.bt_xldata.set.phaseseg2) {
        reg.XBTP.report.push({
          severityLevel: sevC.Error, // error
          msg: `XBTP: SJW (${reg.general.bt_xldata.set.sjw}) > PhaseSeg2 (${reg.general.bt_xldata.set.phaseseg2}). ISO 11898-1 requires SJW <= PhaseSeg2.`
        });
      }

      // Check: check for PhaseSeg2 >= 2
      if (reg.general.bt_xldata.set.phaseseg2 < 2) {
        reg.XBTP.report.push({
          severityLevel: sevC.Error, // error
          msg: `XBTP: PhaseSeg2 (${reg.general.bt_xldata.set.phaseseg2}) < 2. ISO 11898-1 requires a value >= 2.`
        });
      }

      // Check: SJW choosen as large as possible?
      if (reg.general.bt_xldata.set.sjw < reg.general.bt_xldata.set.phaseseg2) {
        reg.XBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `XBTP: SJW (${reg.general.bt_xldata.set.sjw}) < PhaseSeg2 (${reg.general.bt_xldata.set.phaseseg2}). It is recommended to use SJW=PhaseSeg2.`
        });
      }

      // Check: Number of TQ large enough?
      if (reg.general.bt_fddata.res.tq_per_bit < 8) {
        reg.DBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `XBTP: Number of TQ/Bit is small. If possible, increase the TQ/Bit by reducing BRP or increasing the CAN Clock Freq.`
        });
      }

      // Ratio of Arb. Bit Time / XL Data Bit Time >= 2 ?
      if (!reg.MODE || !reg.MODE.fields || reg.MODE.fields.EFDI == 0) { // Error Signaling is enabled
        if (reg.general.bt_arb.res.tq_per_bit < (2 * reg.general.bt_xldata.res.tq_per_bit)) {
          reg.XBTP.report.push({
            severityLevel: sevC.Error, // error
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
    reg.PCFG.fields.PWML = getBits(regValue, 13, 8) + 1;  // PWM Long
    reg.PCFG.fields.PWMS = getBits(regValue, 5, 0) + 1;   // PWM Short

    // 2. Store PWM settings in XL data structure
    reg.general.bt_xldata.set.pwm_offset = reg.PCFG.fields.PWMO;
    reg.general.bt_xldata.set.pwm_long = reg.PCFG.fields.PWML;
    reg.general.bt_xldata.set.pwm_short = reg.PCFG.fields.PWMS;

    // different output based on XLOE & TMS
    if (!reg.MODE || !reg.MODE.fields || (reg.MODE.fields.XLOE !== undefined && reg.MODE.fields.XLOE == 0) || (reg.MODE.fields.XLTR !== undefined && reg.MODE.fields.XLTR == 0) || !reg.XBTP) {
      // 3. Generate human-readable register report
      reg.PCFG.report.push({
        severityLevel: sevC.Info, // info
        msg: `PCFG: ${reg.PCFG.name_long} (0x${reg.PCFG.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `XL Operation (MODE.XLOE=0) OR Transceiver Mode Switch (MODE.XLTR=0) is disabled OR MODE register not present`
      });

    } else { // MODE.XLTR == 1 && MODE.XLOE == 1
      // 3. Generate human-readable register report
      reg.PCFG.report.push({
        severityLevel: sevC.Info, // info
          msg: `PCFG: ${reg.PCFG.name_long} (0x${reg.PCFG.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
               `[PWMO] PWM Offset      = ${reg.PCFG.fields.PWMO}\n` +
               `[PWML] PWM Phase Long  = ${reg.PCFG.fields.PWML}\n` +
               `[PWMS] PWM Phase Short = ${reg.PCFG.fields.PWMS}`
      });

      // 4. Calculate PWM results and store in XL data structure
      reg.general.bt_xldata.res.pwm_symbol_len_ns = (reg.general.bt_xldata.set.pwm_short + reg.general.bt_xldata.set.pwm_long) * reg.general.clk_period;
      reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles = (reg.general.bt_xldata.set.pwm_short + reg.general.bt_xldata.set.pwm_long);
      reg.general.bt_xldata.res.pwm_symbols_per_bit_time = (reg.general.bt_xldata.res.tq_per_bit * reg.general.bt_arb.set.brp) / reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles;
      
      // 5. Generate Report about settings
      reg.PCFG.report.push({
        severityLevel: sevC.InfoCalc, // infoCalculated
          msg: `PWM Configuration\nPWM Symbol Length = ${reg.general.bt_xldata.res.pwm_symbol_len_ns} ns = ${reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles} clock cycles\nPWM Symbols per XL Data Bit Time = ${reg.general.bt_xldata.res.pwm_symbols_per_bit_time.toFixed(2)}`
      });

      // Ratio of XL Data Bit Time to PWM Symbol Length
      if (!Number.isInteger(reg.general.bt_xldata.res.pwm_symbols_per_bit_time)) {
        reg.PCFG.report.push({
          severityLevel: sevC.Error, // error
          msg: `Length of XL Data Bit Time is not an integer multiple of PWM Symbol Length. tBit/tPWM=${reg.general.bt_xldata.res.pwm_symbols_per_bit_time.toFixed(2)}`
        });
      }

      // PWM Offset correctness
      const pwmo_calculated = (reg.general.bt_arb.res.tq_per_bit * reg.general.bt_arb.set.brp) % reg.general.bt_xldata.res.pwm_symbol_len_clk_cycles;
      if (pwmo_calculated !== reg.general.bt_xldata.set.pwm_offset) {
        reg.PCFG.report.push({
          severityLevel: sevC.Error, // error
          msg: `PWM Offset (PCFG.PWMO = ${reg.general.bt_xldata.set.pwm_offset}) is wrong. Correct value is PCFG.PWMO = ${pwmo_calculated}`
        });
      }

    } // end if XLOE || XLTR
  } // end if PCFG
}

// ===================================================================================
// Process Other PRT Registers: Extract parameters, validate ranges, generate report
function procRegsPrtOther(reg) {

  // === ENDN: Endianness Test Register ====================================
  if ('ENDN' in reg && reg.ENDN.int32 !== undefined) {
    const regValue = reg.ENDN.int32;

    // 0. Extend existing register structure
    reg.ENDN.fields = {};
    reg.ENDN.report = []; // Initialize report array

    // 1. Decode ENDN register (simple 32-bit value)
    reg.ENDN.fields.ETV = regValue; // Endianness Test Value

    // 2. Generate human-readable register report
    if (regValue === 0x87654321) {
      reg.ENDN.report.push({
        severityLevel: sevC.Info, // info
        msg: `ENDN: ${reg.ENDN.name_long} (0x${reg.ENDN.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[ETV] Endianness Test Value = 0x${regValue.toString(16).toUpperCase().padStart(8, '0')} (Correct)`
      });
    } else {
      reg.ENDN.report.push({
        severityLevel: sevC.Error, // error
        msg: `ENDN: ${reg.ENDN.name_long} (0x${reg.ENDN.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[ETV] Endianness Test Value = 0x${regValue.toString(16).toUpperCase().padStart(8, '0')} (Expected: 0x87654321)`
      });
    }
  }

  // === PREL: PRT Release Identification Register =========================
  if ('PREL' in reg && reg.PREL.int32 !== undefined) {
    const regValue = reg.PREL.int32;

    // 0. Extend existing register structure
    reg.PREL.fields = {};
    reg.PREL.report = []; // Initialize report array

    // 1. Decode all individual bits of PREL register
    reg.PREL.fields.REL = getBits(regValue, 31, 28); // Release
    reg.PREL.fields.STEP = getBits(regValue, 27, 24); // Step
    reg.PREL.fields.SUBSTEP = getBits(regValue, 23, 20); // Substep
    reg.PREL.fields.YEAR = getBits(regValue, 19, 16); // Year
    reg.PREL.fields.MON = getBits(regValue, 15, 8); // Month
    reg.PREL.fields.DAY = getBits(regValue, 7, 0); // Day

    // 2. Generate human-readable register report
    reg.PREL.report.push({
      severityLevel: sevC.Info, // info
      msg: `PREL: ${reg.PREL.name_long} (0x${reg.PREL.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[REL    ] Release  = 0x${reg.PREL.fields.REL.toString(16).toUpperCase()}\n` +
           `[STEP   ] Step     = 0x${reg.PREL.fields.STEP.toString(16).toUpperCase()}\n` +
           `[SUBSTEP] Substep  = 0x${reg.PREL.fields.SUBSTEP.toString(16).toUpperCase()}\n` +
           `[YEAR   ] Year     = 0x${reg.PREL.fields.YEAR.toString(16).toUpperCase()}\n` +
           `[MON    ] Month    = 0x${reg.PREL.fields.MON.toString(16).toUpperCase().padStart(2, '0')}\n` +
           `[DAY    ] Day      = 0x${reg.PREL.fields.DAY.toString(16).toUpperCase().padStart(2, '0')}`
    });

    // Generate Version Report
    reg.PREL.report.push({
      severityLevel: sevC.Info,
      highlight: true,
      msg: `PREL: X_CAN V${reg.PREL.fields.REL.toString(16).toUpperCase()}.${reg.PREL.fields.STEP.toString(16).toUpperCase()}.${reg.PREL.fields.SUBSTEP.toString(16).toUpperCase()}, Date ${reg.PREL.fields.DAY.toString(16).toUpperCase().padStart(2, '0')}.${reg.PREL.fields.MON.toString(16).toUpperCase().padStart(2, '0')}.${reg.PREL.fields.YEAR.toString(16).toUpperCase().padStart(2, '0')}`
    });
  }

  // === STAT: PRT Status Register =========================================
  if ('STAT' in reg && reg.STAT.int32 !== undefined) {
    const regValue = reg.STAT.int32;

    // 0. Extend existing register structure
    reg.STAT.fields = {};
    reg.STAT.report = []; // Initialize report array

    // 1. Decode all individual bits of STAT register
    reg.STAT.fields.ACT  = getBits(regValue, 1, 0);   // Activity (00: inactive, 01: idle, 10: receiver, 11: transmitter)
    reg.STAT.fields.INT  = getBits(regValue, 2, 2);   // Integrating (1: integrating into bus communication)
    reg.STAT.fields.STP  = getBits(regValue, 3, 3);   // Stop (1: Waiting for End of current frame TX/RX)
    reg.STAT.fields.CLKA = getBits(regValue, 4, 4);   // CLOCK_ACTIVE (1: active)
    reg.STAT.fields.FIMA = getBits(regValue, 5, 5);   // Fault Injection Mode Active
    reg.STAT.fields.EP   = getBits(regValue, 6, 6);   // Error Passive State
    reg.STAT.fields.BO   = getBits(regValue, 7, 7);   // Bus Off State
    reg.STAT.fields.TDCV = getBits(regValue, 15, 8);  // TDC Value
    reg.STAT.fields.REC  = getBits(regValue, 22, 16); // Receive Error Counter
    reg.STAT.fields.RP   = getBits(regValue, 23, 23); // Receive Error Counter Carry Flag
    reg.STAT.fields.TEC  = getBits(regValue, 31, 24); // Transmit Error Counter

    // 2. Generate human-readable register report
    reg.STAT.report.push({
      severityLevel: sevC.Info, // info
      msg: `STAT: ${reg.STAT.name_long} (0x${reg.STAT.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[ACT ] Activity                     = ${reg.STAT.fields.ACT} (0: inactive, 1: idle, 2: receiver, 3: transmitter))\n` +
           `[INT ] Integrating                  = ${reg.STAT.fields.INT}\n` +
           `[STP ] Stop                         = ${reg.STAT.fields.STP}\n` +
           `[CLKA] Clock Active                 = ${reg.STAT.fields.CLKA}\n` +
           `[FIMA] Fault Injection Mode Active  = ${reg.STAT.fields.FIMA}\n` +
           `[EP  ] Error Passive State          = ${reg.STAT.fields.EP}\n` +
           `[BO  ] Bus Off State                = ${reg.STAT.fields.BO}\n` +
           `[TDCV] Transmitter Delay Comp Value = ${reg.STAT.fields.TDCV}\n` +
           `[REC ] Receive Error Counter        = ${reg.STAT.fields.REC}\n` +
           `[RP  ] RX Error Counter Carry Flag  = ${reg.STAT.fields.RP}\n` +
           `[TEC ] Transmit Error Counter       = ${reg.STAT.fields.TEC}`
    });

    // 3. Add status-specific warnings/errors
    if (reg.STAT.fields.BO === 1) {
      reg.STAT.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `CAN controller is in Bus Off state`
      });
    }
    if (reg.STAT.fields.EP === 1) {
      reg.STAT.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `CAN controller is in Error Passive state`
      });
    }
    if (reg.STAT.fields.TEC > 0) {
      reg.STAT.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `Transmit Error Counter > 0. Errors seen recently on CAN bus.`
      });
    }
    if (reg.STAT.fields.REC > 96) {
      reg.STAT.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `Receive Error Counter > 0. Errors seen recently on CAN bus.`
      });
    }
  }
// TODO AB HIER: Check the decoding of the registers. It The code is written by copilot.
  // === EVNT: Event Status Flags Register ================================
  if ('EVNT' in reg && reg.EVNT.int32 !== undefined) {
    const regValue = reg.EVNT.int32;

    // 0. Extend existing register structure
    reg.EVNT.fields = {};
    reg.EVNT.report = []; // Initialize report array

    // 1. Decode all individual bits of EVNT register
    reg.EVNT.fields.RXFI = getBits(regValue, 31, 31); // RX FIFO Interrupt
    reg.EVNT.fields.TXFI = getBits(regValue, 30, 30); // TX FIFO Interrupt
    reg.EVNT.fields.TEFI = getBits(regValue, 29, 29); // TX Event FIFO Interrupt
    reg.EVNT.fields.HPMI = getBits(regValue, 28, 28); // High Priority Message Interrupt
    reg.EVNT.fields.WKUI = getBits(regValue, 27, 27); // Wake Up Interrupt
    reg.EVNT.fields.MRAF = getBits(regValue, 17, 17); // Message RAM Access Failure
    reg.EVNT.fields.TSWE = getBits(regValue, 16, 16); // Timestamp Wraparound Event
    reg.EVNT.fields.ELO = getBits(regValue, 15, 15); // Error Logging Overflow
    reg.EVNT.fields.EP = getBits(regValue, 14, 14); // Error Passive
    reg.EVNT.fields.EW = getBits(regValue, 13, 13); // Error Warning
    reg.EVNT.fields.BO = getBits(regValue, 12, 12); // Bus Off
    reg.EVNT.fields.WDI = getBits(regValue, 11, 11); // Watchdog Interrupt
    reg.EVNT.fields.PEA = getBits(regValue, 10, 10); // Protocol Error in Arbitration Phase
    reg.EVNT.fields.PED = getBits(regValue, 9, 9); // Protocol Error in Data Phase
    reg.EVNT.fields.ARA = getBits(regValue, 8, 8); // Access to Reserved Address

    // 2. Generate human-readable register report
  reg.EVNT.report.push({
        severityLevel: sevC.Info, // info
        msg: `EVNT: ${reg.EVNT.name_long} (0x${reg.EVNT.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[RXFI] RX FIFO Interrupt          = ${reg.EVNT.fields.RXFI}\n` +
             `[TXFI] TX FIFO Interrupt          = ${reg.EVNT.fields.TXFI}\n` +
             `[TEFI] TX Event FIFO Interrupt    = ${reg.EVNT.fields.TEFI}\n` +
             `[HPMI] High Priority Message Int  = ${reg.EVNT.fields.HPMI}\n` +
             `[WKUI] Wake Up Interrupt          = ${reg.EVNT.fields.WKUI}\n` +
             `[MRAF] Message RAM Access Failure = ${reg.EVNT.fields.MRAF}\n` +
             `[TSWE] Timestamp Wraparound Event = ${reg.EVNT.fields.TSWE}\n` +
             `[ELO ] Error Logging Overflow     = ${reg.EVNT.fields.ELO}\n` +
             `[EP  ] Error Passive              = ${reg.EVNT.fields.EP}\n` +
             `[EW  ] Error Warning              = ${reg.EVNT.fields.EW}\n` +
             `[BO  ] Bus Off                    = ${reg.EVNT.fields.BO}\n` +
             `[WDI ] Watchdog Interrupt         = ${reg.EVNT.fields.WDI}\n` +
             `[PEA ] Protocol Error Arbitration = ${reg.EVNT.fields.PEA}\n` +
             `[PED ] Protocol Error Data Phase  = ${reg.EVNT.fields.PED}\n` +
             `[ARA ] Access to Reserved Address = ${reg.EVNT.fields.ARA}`
    });

    // 3. Add event-specific warnings/errors
    if (reg.EVNT.fields.BO === 1) {
      reg.EVNT.report.push({
        severityLevel: sevC.Error, // error
        msg: `Bus Off condition detected - CAN controller is offline`
      });
    }
    if (reg.EVNT.fields.EP === 1) {
      reg.EVNT.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `Error Passive state - high error rate detected`
      });
    }
    if (reg.EVNT.fields.EW === 1) {
      reg.EVNT.report.push({
        severityLevel: sevC.Recom, // recommendation
        msg: `Error Warning state - monitor error counters`
      });
    }
    if (reg.EVNT.fields.MRAF === 1) {
      reg.EVNT.report.push({
        severityLevel: sevC.Error, // error
        msg: `Message RAM Access Failure detected`
      });
    }
  }

  // === LOCK: Unlock Sequence Register ===================================
  if ('LOCK' in reg && reg.LOCK.int32 !== undefined) {
    const regValue = reg.LOCK.int32;

    // 0. Extend existing register structure
    reg.LOCK.fields = {};
    reg.LOCK.report = []; // Initialize report array

    // 1. Decode LOCK register
    reg.LOCK.fields.UNLOCK = regValue; // Unlock Value

    // 2. Generate human-readable register report
  reg.LOCK.report.push({
        severityLevel: sevC.Info, // info
        msg: `LOCK: ${reg.LOCK.name_long} (0x${reg.LOCK.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[UNLOCK] Unlock Value = 0x${regValue.toString(16).toUpperCase().padStart(8, '0')}`
    });
  }

  // === CTRL: Control Register ==========================================
  if ('CTRL' in reg && reg.CTRL.int32 !== undefined) {
    const regValue = reg.CTRL.int32;

    // 0. Extend existing register structure
    reg.CTRL.fields = {};
    reg.CTRL.report = []; // Initialize report array

    // 1. Decode all individual bits of CTRL register
    reg.CTRL.fields.NISO = getBits(regValue, 15, 15); // Non-ISO Operation
    reg.CTRL.fields.TXP = getBits(regValue, 14, 14); // Transmit Pause
    reg.CTRL.fields.EFBI = getBits(regValue, 13, 13); // Edge Filtering during Bus Integration
    reg.CTRL.fields.PXHD = getBits(regValue, 12, 12); // Protocol Exception Handling Disable
    reg.CTRL.fields.WMM = getBits(regValue, 11, 11); // Wide Message Marker
    reg.CTRL.fields.UTSU = getBits(regValue, 10, 10); // Use Timestamping Unit
    reg.CTRL.fields.BRSE = getBits(regValue, 9, 9); // Bit Rate Switch Enable
    reg.CTRL.fields.LOM = getBits(regValue, 8, 8); // Loop Back Mode
    reg.CTRL.fields.DAR = getBits(regValue, 7, 7); // Disable Automatic Retransmission
    reg.CTRL.fields.CCE = getBits(regValue, 6, 6); // Configuration Change Enable
    reg.CTRL.fields.TEST = getBits(regValue, 5, 5); // Test Mode Enable
    reg.CTRL.fields.MON = getBits(regValue, 4, 4); // Bus Monitoring Mode
    reg.CTRL.fields.CSR = getBits(regValue, 3, 3); // Clock Stop Request
    reg.CTRL.fields.CSA = getBits(regValue, 2, 2); // Clock Stop Acknowledge
    reg.CTRL.fields.ASM = getBits(regValue, 1, 1); // Restricted Operation Mode
    reg.CTRL.fields.INIT = getBits(regValue, 0, 0); // Initialization

    // 2. Generate human-readable register report
  reg.CTRL.report.push({
        severityLevel: sevC.Info, // info
        msg: `CTRL: ${reg.CTRL.name_long} (0x${reg.CTRL.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[NISO] Non-ISO Operation              = ${reg.CTRL.fields.NISO}\n` +
             `[TXP ] Transmit Pause                 = ${reg.CTRL.fields.TXP}\n` +
             `[EFBI] Edge Filtering Bus Integration = ${reg.CTRL.fields.EFBI}\n` +
             `[PXHD] Protocol Exception Disable     = ${reg.CTRL.fields.PXHD}\n` +
             `[WMM ] Wide Message Marker            = ${reg.CTRL.fields.WMM}\n` +
             `[UTSU] Use Timestamping Unit          = ${reg.CTRL.fields.UTSU}\n` +
             `[BRSE] Bit Rate Switch Enable         = ${reg.CTRL.fields.BRSE}\n` +
             `[LOM ] Loop Back Mode                 = ${reg.CTRL.fields.LOM}\n` +
             `[DAR ] Disable Auto Retransmission    = ${reg.CTRL.fields.DAR}\n` +
             `[CCE ] Configuration Change Enable    = ${reg.CTRL.fields.CCE}\n` +
             `[TEST] Test Mode Enable               = ${reg.CTRL.fields.TEST}\n` +
             `[MON ] Bus Monitoring Mode            = ${reg.CTRL.fields.MON}\n` +
             `[CSR ] Clock Stop Request             = ${reg.CTRL.fields.CSR}\n` +
             `[CSA ] Clock Stop Acknowledge         = ${reg.CTRL.fields.CSA}\n` +
             `[ASM ] Restricted Operation Mode      = ${reg.CTRL.fields.ASM}\n` +
             `[INIT] Initialization                 = ${reg.CTRL.fields.INIT}`
    });

    // 3. Add control-specific information
    if (reg.CTRL.fields.INIT === 1) {
      reg.CTRL.report.push({
        severityLevel: sevC.Recom, // recommendation
        msg: `Controller is in Initialization mode - switch to Normal mode for operation`
      });
    }
    if (reg.CTRL.fields.MON === 1) {
      reg.CTRL.report.push({
        severityLevel: sevC.Info, // info
        msg: `Bus Monitoring Mode is active - controller will not transmit`
      });
    }
  }

  // === FIMC: Fault Injection Module Control Register ===================
  if ('FIMC' in reg && reg.FIMC.int32 !== undefined) {
    const regValue = reg.FIMC.int32;

    // 0. Extend existing register structure
    reg.FIMC.fields = {};
    reg.FIMC.report = []; // Initialize report array

    // 1. Decode all individual bits of FIMC register
    reg.FIMC.fields.FIME = getBits(regValue, 31, 31); // Fault Injection Module Enable
    reg.FIMC.fields.FIMS = getBits(regValue, 30, 29); // Fault Injection Module Select
    reg.FIMC.fields.FIMF = getBits(regValue, 28, 24); // Fault Injection Module Function
    reg.FIMC.fields.FIMP = getBits(regValue, 23, 16); // Fault Injection Module Parameter
    reg.FIMC.fields.FIMV = getBits(regValue, 15, 0);  // Fault Injection Module Value

    // 2. Generate human-readable register report
  reg.FIMC.report.push({
        severityLevel: sevC.Info, // info
        msg: `FIMC: ${reg.FIMC.name_long} (0x${reg.FIMC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[FIME] Fault Injection Enable        = ${reg.FIMC.fields.FIME}\n` +
             `[FIMS] Fault Injection Module Select = ${reg.FIMC.fields.FIMS}\n` +
             `[FIMF] Fault Injection Function      = ${reg.FIMC.fields.FIMF}\n` +
             `[FIMP] Fault Injection Parameter     = ${reg.FIMC.fields.FIMP}\n` +
             `[FIMV] Fault Injection Value         = ${reg.FIMC.fields.FIMV}`
    });

    // 3. Add fault injection warnings
    if (reg.FIMC.fields.FIME === 1) {
      reg.FIMC.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `Fault Injection Module is enabled - this should only be used for testing`
      });
    }
  }

  // === TEST: Hardware Test Functions Register ========================
  if ('TEST' in reg && reg.TEST.int32 !== undefined) {
    const regValue = reg.TEST.int32;

    // 0. Extend existing register structure
    reg.TEST.fields = {};
    reg.TEST.report = []; // Initialize report array

    // 1. Decode all individual bits of TEST register
    reg.TEST.fields.SVAL = getBits(regValue, 21, 21); // Start Value
    reg.TEST.fields.TXBNS = getBits(regValue, 20, 16); // TX Buffer Number Select
    reg.TEST.fields.PVAL = getBits(regValue, 15, 15); // Prepend Value
    reg.TEST.fields.TXBNP = getBits(regValue, 14, 10); // TX Buffer Number Prepend
    reg.TEST.fields.RX = getBits(regValue, 7, 7); // Receive Pin
    reg.TEST.fields.TX = getBits(regValue, 6, 5); // TX Pin Control
    reg.TEST.fields.LBCK = getBits(regValue, 4, 4); // Loop Back Mode
    reg.TEST.fields.SILENT = getBits(regValue, 3, 3); // Silent Mode
    reg.TEST.fields.BASIC = getBits(regValue, 2, 2); // Basic Mode

    // 2. Generate human-readable register report
  reg.TEST.report.push({
        severityLevel: sevC.Info, // info
        msg: `TEST: ${reg.TEST.name_long} (0x${reg.TEST.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[SVAL ] Start Value              = ${reg.TEST.fields.SVAL}\n` +
             `[TXBNS] TX Buffer Number Select  = ${reg.TEST.fields.TXBNS}\n` +
             `[PVAL ] Prepend Value            = ${reg.TEST.fields.PVAL}\n` +
             `[TXBNP] TX Buffer Number Prepend = ${reg.TEST.fields.TXBNP}\n` +
             `[RX   ] Receive Pin              = ${reg.TEST.fields.RX}\n` +
             `[TX   ] TX Pin Control           = ${reg.TEST.fields.TX}\n` +
             `[LBCK ] Loop Back Mode           = ${reg.TEST.fields.LBCK}\n` +
             `[SILENT] Silent Mode             = ${reg.TEST.fields.SILENT}\n` +
             `[BASIC] Basic Mode               = ${reg.TEST.fields.BASIC}`
    });

    // 3. Add test mode information
    if (reg.TEST.fields.LBCK === 1) {
      reg.TEST.report.push({
        severityLevel: sevC.Recom, // recommendation
        msg: `Loop Back Mode is active - for testing only`
      });
    }
    if (reg.TEST.fields.SILENT === 1) {
      reg.TEST.report.push({
        severityLevel: sevC.Recom, // recommendation
        msg: `Silent Mode is active - controller will not transmit dominant bits`
      });
    }
  }

}