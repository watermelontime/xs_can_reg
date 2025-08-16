// M_CAN: Main script for processing CAN XL registers and calculating bit timing parameters
import { getBits } from './help_functions.js';
import { sevC } from './help_functions.js';

// ===================================================================================
// X_CAN: Process User Register Values: parse, validate, calculate results, generate report
export function processRegsOfM_CAN(reg) {
  // Map raw addresses to register names
  mapRawRegistersToNames(reg);
  console.log('[Info] Step 2 - Mapped register values (reg object):', reg);

  // c1) Process Bit Timing registers
  procRegsPrtBitTiming(reg);
  
  // c2) Process Other PRT registers
  procRegsPrtOther(reg);

  // c3) check MRAM Memory Map and visualise it
  checkMcanMessageRamMap(reg);

  console.log('[Info] Registers with data and reports, reg object:', reg);
}

// ==================================================================================
// Example Register Values for M_CAN
export function loadExampleRegisterValues() {
  const clock = 80;
  const registerString = `# M_CAN example register values
# Format to use: 0xADDR 0xVALUE
# 0xADDR is relative M_CAN address
0x000 0x32150323
0x004 0x87654321
0x008 0x00000000
0x00C 0x00801ABB
0x010 0x00000080
0x014 0x00000F0F
0x018 0x00000300
0x01C 0x3E007E1F
0x020 0x00000000
0x024 0x00000000
0x028 0xFFFF0000
0x02C 0x0000FFFF
0x040 0x00000000
0x044 0x00273008
0x048 0x00001B00
0x050 0x000000D0
0x054 0x00001001
0x058 0x00000000
0x05C 0x00000001
0x080 0x0000003F
0x084 0x000A0000
0x088 0x00010028
0x090 0x1FFFFFFF
0x094 0x00000000
0x098 0x00000000
0x09C 0x00000000
0x0A0 0x00400030
0x0A4 0x00141400
0x0A8 0x00000013
0x0AC 0x00000000
0x0B0 0x00071230
0x0B4 0x02020405
0x0B8 0x00000003
0x0BC 0x00000077
0x0C0 0x00051528
0x0C4 0x00000000
0x0C8 0x00000005
0x0CC 0x00000000
0x0D0 0x00000000
0x0D4 0x00000000
0x0D8 0x00000003
0x0DC 0x00000000
0x0E0 0x00000000
0x0E4 0x00000000
0x0F0 0x00201428
0x0F4 0x00111100
0x0F8 0x00000010`;

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
  
  // Address to register name mapping based on M_CAN specification
  const addressMap = {
    0x000: { shortName: 'CREL', longName: 'Core Release Register' },
    0x004: { shortName: 'ENDN', longName: 'Endian Register' },
    0x008: { shortName: 'CUST', longName: 'Customer Register' },
    0x00C: { shortName: 'DBTP', longName: 'Data Bit Timing & Prescaler Register' },
    0x010: { shortName: 'TEST', longName: 'Test Register' },
    0x014: { shortName: 'RWD', longName: 'RAM Watchdog' },
    0x018: { shortName: 'CCCR', longName: 'CC Control Register' },
    0x01C: { shortName: 'NBTP', longName: 'Nominal Bit Timing & Prescaler Register' },
    0x020: { shortName: 'TSCC', longName: 'Timestamp Counter Configuration' },
    0x024: { shortName: 'TSCV', longName: 'Timestamp Counter Value' },
    0x028: { shortName: 'TOCC', longName: 'Timeout Counter Configuration' },
    0x02C: { shortName: 'TOCV', longName: 'Timeout Counter Value' },
    0x040: { shortName: 'ECR', longName: 'Error Counter Register' },
    0x044: { shortName: 'PSR', longName: 'Protocol Status Register' },
    0x048: { shortName: 'TDCR', longName: 'Transmitter Delay Compensation Register' },
    0x050: { shortName: 'IR', longName: 'Interrupt Register' },
    0x054: { shortName: 'IE', longName: 'Interrupt Enable' },
    0x058: { shortName: 'ILS', longName: 'Interrupt Line Select' },
    0x05C: { shortName: 'ILE', longName: 'Interrupt Line Enable' },
    0x080: { shortName: 'GFC', longName: 'Global Filter Configuration' },
    0x084: { shortName: 'SIDFC', longName: 'Standard ID Filter Configuration' },
    0x088: { shortName: 'XIDFC', longName: 'Extended ID Filter Configuration' },
    0x090: { shortName: 'XIDAM', longName: 'Extended ID AND Mask' },
    0x094: { shortName: 'HPMS', longName: 'High Priority Message Status' },
    0x098: { shortName: 'NDAT1', longName: 'New Data 1' },
    0x09C: { shortName: 'NDAT2', longName: 'New Data 2' },
    0x0A0: { shortName: 'RXF0C', longName: 'Rx FIFO 0 Configuration' },
    0x0A4: { shortName: 'RXF0S', longName: 'Rx FIFO 0 Status' },
    0x0A8: { shortName: 'RXF0A', longName: 'Rx FIFO 0 Acknowledge' },
    0x0AC: { shortName: 'RXBC', longName: 'Rx Buffer Configuration' },
    0x0B0: { shortName: 'RXF1C', longName: 'Rx FIFO 1 Configuration' },
    0x0B4: { shortName: 'RXF1S', longName: 'Rx FIFO 1 Status' },
    0x0B8: { shortName: 'RXF1A', longName: 'Rx FIFO 1 Acknowledge' },
    0x0BC: { shortName: 'RXESC', longName: 'Rx Buffer / FIFO Element Size Configuration' },
    0x0C0: { shortName: 'TXBC', longName: 'Tx Buffer Configuration' },
    0x0C4: { shortName: 'TXFQS', longName: 'Tx FIFO/Queue Status' },
    0x0C8: { shortName: 'TXESC', longName: 'Tx Buffer Element Size Configuration' },
    0x0CC: { shortName: 'TXBRP', longName: 'Tx Buffer Request Pending' },
    0x0D0: { shortName: 'TXBAR', longName: 'Tx Buffer Add Request' },
    0x0D4: { shortName: 'TXBCR', longName: 'Tx Buffer Cancellation Request' },
    0x0D8: { shortName: 'TXBTO', longName: 'Tx Buffer Transmission Occurred' },
    0x0DC: { shortName: 'TXBCF', longName: 'Tx Buffer Cancellation Finished' },
    0x0E0: { shortName: 'TXBTIE', longName: 'Tx Buffer Transmission Interrupt Enable' },
    0x0E4: { shortName: 'TXBCIE', longName: 'Tx Buffer Cancellation Finished Interrupt Enable' },
    0x0F0: { shortName: 'TXEFC', longName: 'Tx Event FIFO Configuration' },
    0x0F4: { shortName: 'TXEFS', longName: 'Tx Event FIFO Status' },
    0x0F8: { shortName: 'TXEFA', longName: 'Tx Event FIFO Acknowledge' }
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
        msg: `Mapped reg. address 0x${rawReg.addr.toString(16).toUpperCase().padStart(2, '0')} to ${regName} (${mapping.longName})`
      });
    } else {
      // Unknown address
      unmappedCount++;
      
      reg.parse_output.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `Unknown register address: 0x${rawReg.addr.toString(16).toUpperCase().padStart(2, '0')} - register will be ignored`
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
// Help function: Translate configured data field size from to bytes
function decodeConfiguredDataFieldSizeInByte(field) {
  switch (field & 0x7) {
    case 0: return 8;
    case 1: return 12;
    case 2: return 16;
    case 3: return 20;
    case 4: return 24;
    case 5: return 32;
    case 6: return 48;
    case 7: return 64;
    default: return '?';
  }
} // decodeConfiguredDataFieldSizeInByte

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

  // Rule: only assign reg.general.* values if they get meaningful values
  //       leave values undefined, if a) according registers are not present
  //                                  b) configuration disables a feature (e.g. TMS=OFF => then do not provide PWM settings & results)

  // === CCCR: Extract parameters from register ==========================
  if ('CCCR' in reg && reg.CCCR.int32 !== undefined) {
    const regValue = reg.CCCR.int32;

    // 0. Extend existing register structure
    reg.CCCR.fields = {};
    reg.CCCR.report = []; // Initialize report array

    // 1. Decode all individual bits of CCCR register (M_CAN CC Control Register)
    reg.CCCR.fields.NISO = getBits(regValue, 15, 15);  // Non ISO Operation
    reg.CCCR.fields.TXP  = getBits(regValue, 14, 14);  // Transmit Pause
    reg.CCCR.fields.EFBI = getBits(regValue, 13, 13);  // Edge Filtering during Bus Integration
    reg.CCCR.fields.PXHD = getBits(regValue, 12, 12);  // Protocol Exception Handling Disable
    reg.CCCR.fields.WMM  = getBits(regValue, 11, 11);  // Wide Message Marker
    reg.CCCR.fields.UTSU = getBits(regValue, 10, 10);  // Use Timestamping Unit
    reg.CCCR.fields.BRSE = getBits(regValue, 9, 9);    // Bit Rate Switch Enable
    reg.CCCR.fields.FDOE = getBits(regValue, 8, 8);    // FD Operation Enable
    reg.CCCR.fields.TEST = getBits(regValue, 7, 7);    // Test Mode Enable
    reg.CCCR.fields.DAR  = getBits(regValue, 6, 6);    // Disable Automatic Retransmission
    reg.CCCR.fields.MON  = getBits(regValue, 5, 5);    // Bus Monitoring Mode
    reg.CCCR.fields.CSR  = getBits(regValue, 4, 4);    // Clock Stop Request
    reg.CCCR.fields.CSA  = getBits(regValue, 3, 3);    // Clock Stop Acknowledge
    reg.CCCR.fields.ASM  = getBits(regValue, 2, 2);    // Restricted Operation Mode
    reg.CCCR.fields.CCE  = getBits(regValue, 1, 1);    // Configuration Change Enable
    reg.CCCR.fields.INIT = getBits(regValue, 0, 0);    // Initialization
    
    // 2. Store CCCR-related bit timing settings in general structure
    reg.general.bt_global.set.fd  = (reg.CCCR.fields.FDOE === 1); // FD Operation Enable when FDOE=1
    reg.general.bt_global.set.fdbrs = (reg.CCCR.fields.BRSE === 1); // FD Bit Rate Switch Enable when BRSE=1
    reg.general.bt_global.set.es  = true;  // Error signaling always enabled in standard M_CAN
    reg.general.bt_global.set.tms = false; // No TMS (Transceiver Mode Switching) in standard M_CAN
    reg.general.bt_global.set.xl  = false; // No XL support in standard M_CAN

    // 3. Generate human-readable register report
    reg.CCCR.report.push({
        severityLevel: sevC.Info, // info
        msg: `CCCR: ${reg.CCCR.name_long} (0x${reg.CCCR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[NISO] Non ISO Operation                     = ${reg.CCCR.fields.NISO}\n` +
             `[TXP ] Transmit Pause                        = ${reg.CCCR.fields.TXP}\n` +
             `[EFBI] Edge Filtering during Bus Integration = ${reg.CCCR.fields.EFBI}\n` +
             `[PXHD] Protocol Exception Handling Disable   = ${reg.CCCR.fields.PXHD}\n` +
             `[WMM ] Wide Message Marker                   = ${reg.CCCR.fields.WMM} (0: 8 bit MM, 1: 16 bit MM)\n` +
             `[UTSU] Use Timestamping Unit (TSU)           = ${reg.CCCR.fields.UTSU} (0: internal, 1: use TSU)\n` +
             `[BRSE] Bit Rate Switch Enable                = ${reg.CCCR.fields.BRSE}\n` +
             `[FDOE] FD Operation Enable                   = ${reg.CCCR.fields.FDOE}\n` +
             `[TEST] Test Mode Enable                      = ${reg.CCCR.fields.TEST}\n` +
             `[DAR ] Disable Automatic Retransmission      = ${reg.CCCR.fields.DAR}\n` +
             `[MON ] Bus Monitoring Mode                   = ${reg.CCCR.fields.MON}\n` +
             `[CSR ] Clock Stop Request                    = ${reg.CCCR.fields.CSR}\n` +
             `[CSA ] Clock Stop Acknowledge                = ${reg.CCCR.fields.CSA}\n` +
             `[ASM ] Restricted Operation Mode             = ${reg.CCCR.fields.ASM}\n` +
             `[CCE ] Configuration Change Enable           = ${reg.CCCR.fields.CCE}\n` +
             `[INIT] Initialization                        = ${reg.CCCR.fields.INIT}`
    });

    // Check: FDOE and BRSE should both be set for FD operation
    if (reg.CCCR.fields.FDOE === 1 && reg.CCCR.fields.BRSE === 0) {
      reg.CCCR.report.push({
        severityLevel: sevC.Info,
        highlight: true,
        msg: `CCCR: FDOE is set but BRSE is not set. For full CAN FD operation, both FDOE and BRSE should be enabled.`
      });
    }

    // Check: Configuration should not be in initialization mode during normal operation
    if (reg.CCCR.fields.INIT === 1 || reg.CCCR.fields.CCE === 1) {
      reg.CCCR.report.push({
        severityLevel: sevC.Warn,
        msg: `CCCR: M_CAN is not started (no RX/TX possible): (INIT=1) or (CCE=1).`
      });
    }

    // Check: Test mode indication
    if (reg.CCCR.fields.TEST === 1) {
      reg.CCCR.report.push({
        severityLevel: sevC.Warn,
        msg: `CCCR: Test Mode is enabled (TEST=1). This should only be used for testing purposes.`
      });
    }

    // Check: Bus monitoring mode indication
    if (reg.CCCR.fields.MON === 1) {
      reg.CCCR.report.push({
        severityLevel: sevC.Warn,
        msg: `CCCR: Bus Monitoring Mode is active (MON=1). Controller will not transmit on TX pin at all, also no ACK or Error Frames.`
      });
    }

    // Check: Restricted operation mode
    if (reg.CCCR.fields.ASM === 1) {
      reg.CCCR.report.push({
        severityLevel: sevC.Warn,
        msg: `CCCR: Restricted Operation Mode is active (ASM=1). Controller will not transmit frames, but it will transmit an ACK on successful reception.`
      });
    }
  } // CCCR

  // === NBTP: Extract parameters from register ==========================
  if ('NBTP' in reg && reg.NBTP.int32 !== undefined) {
    const regValue = reg.NBTP.int32;

    // 0. Extend existing register structure
    reg.NBTP.fields = {};
    reg.NBTP.report = []; // Initialize report array

    // 1. Decode all individual bits of NBTP register (M_CAN specification)
    reg.NBTP.fields.NSJW   = getBits(regValue, 31, 25) + 1; // Nominal Synchronization Jump Width (8 bits)
    reg.NBTP.fields.NBRP   = getBits(regValue, 24, 16) + 1; // Nominal Bit Rate Prescaler (7 bits)
    reg.NBTP.fields.NTSEG1 = getBits(regValue, 15, 8) + 1;  // Nominal Time Segment 1 (9 bits)
    reg.NBTP.fields.NTSEG2 = getBits(regValue, 7, 0) + 1;   // Nominal Time Segment 2 (8 bits)

    // 2. Store NBTP bit timing settings in general structure
    reg.general.bt_arb.set.brp = reg.NBTP.fields.NBRP;
    reg.general.bt_arb.set.prop_and_phaseseg1 = reg.NBTP.fields.NTSEG1;
    reg.general.bt_arb.set.phaseseg2 = reg.NBTP.fields.NTSEG2;
    reg.general.bt_arb.set.sjw = reg.NBTP.fields.NSJW;

    // 3. Generate human-readable register report
    reg.NBTP.report.push({
        severityLevel: sevC.Info, // info
        msg: `NBTP: ${reg.NBTP.name_long} (0x${reg.NBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[NSJW  ] Nominal Synchronization JW = ${reg.NBTP.fields.NSJW} (range: 1-128)\n` +
             `[NBRP  ] Nominal Bit Rate Prescaler = ${reg.NBTP.fields.NBRP} (range: 1-128)\n` +
             `[NTSEG1] Nominal Time Segment 1     = ${reg.NBTP.fields.NTSEG1} (range: 1-256)\n` +
             `[NTSEG2] Nominal Time Segment 2     = ${reg.NBTP.fields.NTSEG2} (range: 1-128)`
    });

    // Validate bit field ranges according to M_CAN specification
    if (reg.NBTP.fields.NBRP < 1 || reg.NBTP.fields.NBRP > 128) {
      reg.NBTP.report.push({
        severityLevel: sevC.Error, // error
        msg: `NBTP: NBRP value ${reg.NBTP.fields.NBRP} is out of valid range (1-128)`
      });
    }

    if (reg.NBTP.fields.NTSEG1 < 1 || reg.NBTP.fields.NTSEG1 > 256) {
      reg.NBTP.report.push({
        severityLevel: sevC.Error, // error
        msg: `NBTP: NTSEG1 value ${reg.NBTP.fields.NTSEG1} is out of valid range (1-256)`
      });
    }

    if (reg.NBTP.fields.NTSEG2 < 1 || reg.NBTP.fields.NTSEG2 > 128) {
      reg.NBTP.report.push({
        severityLevel: sevC.Error, // error
        msg: `NBTP: NTSEG2 value ${reg.NBTP.fields.NTSEG2} is out of valid range (2-128)`
      });
    }

    if (reg.NBTP.fields.NSJW < 1 || reg.NBTP.fields.NSJW > 128) {
      reg.NBTP.report.push({
        severityLevel: sevC.Error, // error
        msg: `NBTP: NSJW value ${reg.NBTP.fields.NSJW} is out of valid range (1-128)`
      });
    }

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
             `TQ Length  = ${reg.general.bt_arb.res.tq_len} ns\n` +
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
        msg: `NBTP: Number of TQ/Bit is small. If possible, increase the TQ/Bit by reducing NBRP or increasing the CAN Clock Freq.`
      });
    }
  } // end if NBTP

  // === TDCR: Extract parameters from register ==========================
  if ('TDCR' in reg && reg.TDCR.int32 !== undefined) {
    const regValue = reg.TDCR.int32;

    // 0. Extend existing register structure
    reg.TDCR.fields = {};
    reg.TDCR.report = []; // Initialize report array

    // 1. Decode all individual bits of TDCR register (M_CAN specification)
    // See Bosch M_CAN User's Manual v3.3.1, Page 19
    reg.TDCR.fields.TDCF = getBits(regValue, 6, 0);    // Transmitter Delay Compensation Filter Window Length (7 bits)
    reg.TDCR.fields.TDCO = getBits(regValue, 14, 8);   // Transmitter Delay Compensation SSP Offset (7 bits)

    // only exclude processing register, if it is clear that a) FD operation is disabled OR b) BRS is disabled
    if (reg.general.bt_global.set.fd !== undefined && reg.general.bt_global.set.fd === false ||
        reg.general.bt_global.set.fdbrs !== undefined && reg.general.bt_global.set.fdbrs === false) {
      // 3. Generate human-readable register report
      reg.TDCR.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `TDCR: ${reg.TDCR.name_long} (0x${reg.TDCR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `FD Operation wir BRS is disabled: a) CCCR.FDOE=0 OR b) CCCR.BRSE=0 OR c) CCCR register not present`
      });

    } else {
      // 2. Store DBTP bit timing settings in general structure
      reg.general.bt_fddata.set.ssp_offset = reg.TDCR.fields.TDCO;

      // 3. Generate human-readable register report
      reg.TDCR.report.push({
        severityLevel: sevC.Info, // info
        msg: `TDCR: ${reg.TDCR.name_long} (0x${reg.TDCR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `[TDCF] TDC Filter Window Length = ${reg.TDCR.fields.TDCF}\n` +
             `[TDCO] TDC SSP Offset           = ${reg.TDCR.fields.TDCO}`
      });

    }
  } // end if TDCR

  // === DBTP: Extract parameters from register ==========================
  if ('DBTP' in reg && reg.DBTP.int32 !== undefined) {
    const regValue = reg.DBTP.int32;

    // 0. Extend existing register structure
    reg.DBTP.fields = {};
    reg.DBTP.report = []; // Initialize report array

    // 1. Decode all individual bits of DBTP register (M_CAN specification)
    reg.DBTP.fields.TDC    = getBits(regValue, 23, 23);     // Transmitter Delay Compensation (1 bit)
    reg.DBTP.fields.DBRP   = getBits(regValue, 20, 16) + 1; // Data Bit Rate Prescaler (5 bits)
    reg.DBTP.fields.DTSEG1 = getBits(regValue, 12, 8) + 1;  // Data Time Segment 1 (5 bits)
    reg.DBTP.fields.DTSEG2 = getBits(regValue, 7, 4) + 1;   // Data Time Segment 2 (4 bits)
    reg.DBTP.fields.DSJW   = getBits(regValue, 3, 0) + 1;   // Data Synchronization Jump Width (4 bits)

    // different output based on FD enabled yes/no
    if (reg.general.bt_global.set.fd !== undefined && reg.general.bt_global.set.fd === false ||
        reg.general.bt_global.set.fdbrs !== undefined && reg.general.bt_global.set.fdbrs === false) {
      // 3. Generate human-readable register report
      reg.DBTP.report.push({
        severityLevel: sevC.Warn, // warning
        msg: `DBTP: ${reg.DBTP.name_long} (0x${reg.DBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
             `FD Operation is disabled: a) CCCR.FDOE=0 OR b) CCCR.BRSE=0 OR c) CCCR register not present`
      });

    } else { // FD enabled (or CCCR register not present)
      // 2. Store DBTP bit timing settings in general structure
      reg.general.bt_global.set.tdc = (reg.DBTP.fields.TDC === 1); // TDC enabled when TDC=1
      reg.general.bt_fddata.set.prop_and_phaseseg1 = reg.DBTP.fields.DTSEG1;
      reg.general.bt_fddata.set.phaseseg2 = reg.DBTP.fields.DTSEG2;
      reg.general.bt_fddata.set.sjw = reg.DBTP.fields.DSJW;
      // set brp (M_CAN uses separate data phase prescaler)
      reg.general.bt_fddata.set.brp = reg.DBTP.fields.DBRP;
      
      // 3. Generate human-readable register report
    reg.DBTP.report.push({
      severityLevel: sevC.Info, // info
      msg: `DBTP: ${reg.DBTP.name_long} (0x${reg.DBTP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TDC   ] Transmitter Delay Compensation = ${reg.DBTP.fields.TDC}\n` +
           `[DBRP  ] Data Bit Rate Prescaler        = ${reg.DBTP.fields.DBRP} (range: 1-32)\n` +
           `[DTSEG1] Data Time Segment 1            = ${reg.DBTP.fields.DTSEG1} (range: 1-32)\n` +
           `[DTSEG2] Data Time Segment 2            = ${reg.DBTP.fields.DTSEG2} (range: 1-16)\n` +
           `[DSJW  ] Data Synchronization JW        = ${reg.DBTP.fields.DSJW} (range: 1-16)`
      });

      // 4. Calculate FD data phase results and store in general structure
      reg.general.bt_fddata.res.tq_len = reg.general.clk_period * reg.general.bt_fddata.set.brp;
      reg.general.bt_fddata.res.tq_per_bit = 1 + reg.general.bt_fddata.set.prop_and_phaseseg1 + reg.general.bt_fddata.set.phaseseg2;
      reg.general.bt_fddata.res.bitrate = reg.general.clk_freq / (reg.general.bt_fddata.set.brp * reg.general.bt_fddata.res.tq_per_bit);
      reg.general.bt_fddata.res.bit_length = 1000 / reg.general.bt_fddata.res.bitrate;
      reg.general.bt_fddata.res.sp = 100 - 100 * reg.general.bt_fddata.set.phaseseg2 / reg.general.bt_fddata.res.tq_per_bit;
      // Calculate SSP (Secondary Sample Point) if TDC is enabled
      if (reg.general.bt_global.set.tdc === true &&
          reg.general.bt_fddata.set.ssp_offset !== undefined) {
        reg.general.bt_fddata.res.ssp = 100*reg.general.bt_fddata.set.ssp_offset/reg.general.bt_fddata.res.tq_per_bit;
      } 

      // 5. Generate Report about settings
      reg.DBTP.report.push({
          severityLevel: sevC.InfoCalc, // infoCalculated
          msg: `CAN FD Data Phase Bitrate\n` +
               `Bitrate    = ${reg.general.bt_fddata.res.bitrate} Mbit/s\n` +
               `Bit Length = ${reg.general.bt_fddata.res.bit_length} ns\n` +
               `TQ per Bit = ${reg.general.bt_fddata.res.tq_per_bit}\n` +
               `TQ Length  = ${reg.general.bt_fddata.res.tq_len} ns\n` +
               `SP         = ${reg.general.bt_fddata.res.sp} %\n` +
               `SSP        = ${reg.general.bt_fddata.res.ssp} %`
      });

      // Check: CAN Clock Frequency as recommended in CiA 601-3?
      if ((reg.general.clk_freq != 160) && (reg.general.clk_freq != 80) && (reg.general.clk_freq != 40) && (reg.general.clk_freq != 20)) {
        reg.DBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `CAN FD: Recommended CAN Clock Frequency is 20, 40, 80 MHz and multiples (see CiA 601-3). Current value is ${reg.general.clk_freq} MHz.`
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
          msg: `DBTP: Number of TQ/Bit is small (<8). If possible, increase the TQ/Bit by reducing DBRP or increasing the CAN Clock Freq.`
        });
      }

      // Check if BRP Data > 1
      if (reg.general.bt_fddata.set.brp > 1) {
        reg.DBTP.report.push({
          severityLevel: sevC.Warn, // warning
          msg: `DBTP: BRP (${reg.general.bt_fddata.set.brp}) > 1. A BRP > 1 may reduce robustness. Try using BRP=1.`
        });
      }

    } // end if FDOE=1
  } // end if DBTP

} // end procRegsPrtBitTiming

// ===================================================================================
// Process Other PRT Registers: Extract parameters, validate ranges, generate report
function procRegsPrtOther(reg) {

  // === CREL: PRT Release Identification Register =========================
  if ('CREL' in reg && reg.CREL.int32 !== undefined) {
    const regValue = reg.CREL.int32;

    // 0. Extend existing register structure
    reg.CREL.fields = {};
    reg.CREL.report = []; // Initialize report array

    // 1. Decode all individual bits
    reg.CREL.fields.REL = getBits(regValue, 31, 28); // Release
    reg.CREL.fields.STEP = getBits(regValue, 27, 24); // Step
    reg.CREL.fields.SUBSTEP = getBits(regValue, 23, 20); // Substep
    reg.CREL.fields.YEAR = getBits(regValue, 19, 16); // Year
    reg.CREL.fields.MON = getBits(regValue, 15, 8); // Month
    reg.CREL.fields.DAY = getBits(regValue, 7, 0); // Day
    
    // 2. Generate human-readable register report
    reg.CREL.report.push({
      severityLevel: sevC.Info, // info
      msg: `CREL: ${reg.CREL.name_long} (0x${reg.CREL.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[REL    ] Release = 0x${reg.CREL.fields.REL.toString(16).toUpperCase()}\n` +
           `[STEP   ] Step    = 0x${reg.CREL.fields.STEP.toString(16).toUpperCase()}\n` +
           `[SUBSTEP] Substep = 0x${reg.CREL.fields.SUBSTEP.toString(16).toUpperCase()}\n` +
           `[YEAR   ] Year    = 0x${reg.CREL.fields.YEAR.toString(16).toUpperCase()}\n` +
           `[MON    ] Month   = 0x${reg.CREL.fields.MON.toString(16).toUpperCase().padStart(2, '0')}\n` +
           `[DAY    ] Day     = 0x${reg.CREL.fields.DAY.toString(16).toUpperCase().padStart(2, '0')}`
    });

    // Generate Version Report
    reg.CREL.report.push({
      severityLevel: sevC.Info,
      highlight: true,
      msg: `CREL: M_CAN V${reg.CREL.fields.REL.toString(16).toUpperCase()}.${reg.CREL.fields.STEP.toString(16).toUpperCase()}.${reg.CREL.fields.SUBSTEP.toString(16).toUpperCase()}, Date ${reg.CREL.fields.DAY.toString(16).toUpperCase().padStart(2, '0')}.${reg.CREL.fields.MON.toString(16).toUpperCase().padStart(2, '0')}.${reg.CREL.fields.YEAR.toString(16).toUpperCase().padStart(2, '0')}`
    });
  }

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
  } // ENDN

  // === CUST: Customer Register ================================
  if ('CUST' in reg && reg.CUST.int32 !== undefined) {
    const regValue = reg.CUST.int32;

    // 0. Extend existing register structure
    reg.CUST.fields = {};
    reg.CUST.report = []; // Initialize report array

    // Generate human-readable register report
    reg.CUST.report.push({
      severityLevel: sevC.Info, // info
      msg: `CUST: ${reg.CUST.name_long} (0x${reg.CUST.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})`
    });
  } // CUST

  // === TEST: Hardware Test Functions Register ========================
  if ('TEST' in reg && reg.TEST.int32 !== undefined) {
    const regValue = reg.TEST.int32;

    // 0. Extend existing register structure
    reg.TEST.fields = {};
    reg.TEST.report = []; // Initialize report array

    // 1. Decode all individual bits of TEST register
    reg.TEST.fields.SVAL  = getBits(regValue, 21, 21); // Started Valid
    reg.TEST.fields.TXBNS = getBits(regValue, 20, 16); // TX Buffer Number Started
    reg.TEST.fields.PVAL  = getBits(regValue, 13, 13); // Prepend Valid
    reg.TEST.fields.TXBNP = getBits(regValue, 12,  8); // TX Buffer Number Prepend
    reg.TEST.fields.RX    = getBits(regValue, 7, 7); // Receive Pin
    reg.TEST.fields.TX    = getBits(regValue, 6, 5); // TX Pin Control
    reg.TEST.fields.LBCK  = getBits(regValue, 4, 4); // Loop Back Mode

    // 2. Generate human-readable register report
    reg.TEST.report.push({
      severityLevel: sevC.Info, // info
      msg: `TEST: ${reg.TEST.name_long} (0x${reg.TEST.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[SVAL ] Started Valid             = ${reg.TEST.fields.SVAL}\n` +
           `[TXBNS] TX Buffer Number Started  = ${reg.TEST.fields.TXBNS}\n` +
           `[PVAL ] Prepend Valid             = ${reg.TEST.fields.PVAL}\n` +
           `[TXBNP] TX Buffer Number Prepared = ${reg.TEST.fields.TXBNP}\n` +
           `[RX   ] RX Pin                    = ${reg.TEST.fields.RX}\n` +
           `[TX   ] TX Pin Control            = ${reg.TEST.fields.TX} (0: PRT controlled, 1: SP monitor, 2: Dominant, 3: Recessive)\n` +
           `[LBCK ] Loop Back Mode            = ${reg.TEST.fields.LBCK} (1: enabled)`
    });

    // 3. Report test mode information messages
    if (reg.TEST.fields.LBCK === 1) {
      reg.TEST.report.push({
        severityLevel: sevC.Warn,
        msg: `Loop Back Mode is active - for testing only\n` +
             `When CCCR.MON=1 it is the internal loopback (TX pin shows always recessive)\n` +
             `When CCCR.MON=0 it is the external loopback (TX pin driven by M_CAN PRT)`
      });
    }
    
    if (reg.TEST.fields.TX !== 0) {
      reg.TEST.report.push({
        severityLevel: sevC.Warn,
        msg: `Test Mode is active: TX Pin is under manual control! CAN messages cannot be transmitted.`
      });
    }
  }


  // === RWD: RAM Watchdog ================================================
  if ('RWD' in reg && reg.RWD.int32 !== undefined) {
    const regValue = reg.RWD.int32;

    // 0. Extend existing register structure
    reg.RWD.fields = {};
    reg.RWD.report = []; // Initialize report array

    // 1. Decode all individual bits of RWD register (M_CAN User Manual v3.3.1, page 10)
    reg.RWD.fields.WDV = getBits(regValue, 15, 8);  // Watchdog Value (8 bits)
    reg.RWD.fields.WDC = getBits(regValue, 7, 0);   // Watchdog Configuration (8 bits)

    // 2. Generate human-readable register report
    reg.RWD.report.push({
      severityLevel: sevC.Info, // info
      msg: `RWD: ${reg.RWD.name_long} (0x${reg.RWD.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[WDV] Watchdog Value         = ${reg.RWD.fields.WDV} (current Watchdog counter value)\n` +
           `[WDC] Watchdog Configuration = ${reg.RWD.fields.WDC} (0: disabled, else: start value of Watchdog down-counter)`
    });

    // 3. Add warnings or info if Watchdog Value is close to Configuration
    if (reg.RWD.fields.WDC > 0) {
      reg.RWD.report.push({
        severityLevel: sevC.Info,
        highlight: true,
        msg: `RAM Watchdog is enabled. Configuration: WDC = ${reg.RWD.fields.WDC} Host Clock Cycles`
      });
    }
  }

  // === TSCC: Timestamp Counter Configuration =============================
  if ('TSCC' in reg && reg.TSCC.int32 !== undefined) {
    const regValue = reg.TSCC.int32;

    // 0. Extend existing register structure
    reg.TSCC.fields = {};
    reg.TSCC.report = []; // Initialize report array

    // 1. Decode all individual bits of TSCC register (M_CAN User Manual v3.3.1, page 14)
    reg.TSCC.fields.TCP = getBits(regValue, 19, 16) + 1; // Timestamp Counter Prescaler (4 bits)
    reg.TSCC.fields.TSS = getBits(regValue,  1,  0); // Timestamp Select (2 bits)

    // 2. Generate human-readable register report
    reg.TSCC.report.push({
      severityLevel: sevC.Info, // info
      msg: `TSCC: ${reg.TSCC.name_long} (0x${reg.TSCC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TCP] Timestamp Counter Prescaler = ${reg.TSCC.fields.TCP} (values 1..16)\n` +
           `[TSS] Timestamp Select            = ${reg.TSCC.fields.TSS} (0: disabled, 1: TS counter internal, 2: TS counter external, 3: disabled)`
    });
  } // TSCC

  // === TSCV: Timestamp Counter Value =========================================
  if ('TSCV' in reg && reg.TSCV.int32 !== undefined) {
    const regValue = reg.TSCV.int32;

    // 0. Extend existing register structure
    reg.TSCV.fields = {};
    reg.TSCV.report = []; // Initialize report array

    // 1. Decode all individual bits of TSCV register (M_CAN User Manual v3.3.1, page 14)
    reg.TSCV.fields.TSC = getBits(regValue, 15, 0); // Timestamp Counter Value (16 bits)

    // 2. Generate human-readable register report
    reg.TSCV.report.push({
      severityLevel: sevC.Info, // info
      msg: `TSCV: ${reg.TSCV.name_long} (0x${reg.TSCV.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TSC] Timestamp Counter Value = ${reg.TSCV.fields.TSC} (counter width: 16 bit)`
    });
  } // TSCV

  // === TOCC: Timeout Counter Configuration ==============================
  if ('TOCC' in reg && reg.TOCC.int32 !== undefined) {
    const regValue = reg.TOCC.int32;

    // 0. Extend existing register structure
    reg.TOCC.fields = {};
    reg.TOCC.report = []; // Initialize report array

    // 1. Decode all individual bits of TOCC register (M_CAN User Manual v3.3.1, page 15)
    reg.TOCC.fields.TOP  = getBits(regValue, 31, 16); // Timeout Period (16 bits)
    reg.TOCC.fields.TOS  = getBits(regValue,  2,  1); // Timeout Select (2 bits)
    reg.TOCC.fields.ETOC = getBits(regValue,  0,  0); // Enable Timeout Counter (1 bit)

    // 2. Generate human-readable register report
    reg.TOCC.report.push({
      severityLevel: sevC.Info, // info
      msg: `TOCC: ${reg.TOCC.name_long} (0x${reg.TOCC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TOP ] Timeout Period         = ${reg.TOCC.fields.TOP}\n` +
           `[TOS ] Timeout Select         = ${reg.TOCC.fields.TOS} (0: continuous, 1: TX Event FIFO, 2: RX FIFO0, 3: RX FIFO1)\n` +
           `[ETOC] Enable Timeout Counter = ${reg.TOCC.fields.ETOC}`  
    });
  }

  // === TOCV: Timeout Counter Value ======================================
  if ('TOCV' in reg && reg.TOCV.int32 !== undefined) {
    const regValue = reg.TOCV.int32;

    // 0. Extend existing register structure
    reg.TOCV.fields = {};
    reg.TOCV.report = []; // Initialize report array

    // 1. Decode all individual bits of TOCV register (M_CAN User Manual v3.3.1, page 15)
    reg.TOCV.fields.TOC = getBits(regValue, 15, 0); // Timeout Counter Value (16 bits)

    // 2. Generate human-readable register report
    reg.TOCV.report.push({
      severityLevel: sevC.Info, // info
      msg: `TOCV: ${reg.TOCV.name_long} (0x${reg.TOCV.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TOC] Timeout Counter Value = ${reg.TOCV.fields.TOC} (counter width: 16 bit)`
    });
  }

  // === ECR: Error Counter Register =======================================
  if ('ECR' in reg && reg.ECR.int32 !== undefined) {
    const regValue = reg.ECR.int32;

    // 0. Extend existing register structure
    reg.ECR.fields = {};
    reg.ECR.report = []; // Initialize report array

    // 1. Decode all individual bits of ECR register (M_CAN User Manual v3.3.1, page 16)
    reg.ECR.fields.CEL = getBits(regValue, 23, 16); // CAN Error Logging (8 bits)
    reg.ECR.fields.RP  = getBits(regValue, 15, 15); // Receive Error Passive (1 bit)
    reg.ECR.fields.REC = getBits(regValue, 14,  8); // Receive Error Counter (7 bits)
    reg.ECR.fields.TEC = getBits(regValue,  7,  0); // Transmit Error Counter (8 bits)

    // 2. Generate human-readable register report
    reg.ECR.report.push({
      severityLevel: sevC.Info, // info
      msg: `ECR: ${reg.ECR.name_long} (0x${reg.ECR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[CEL] CAN Error Logging      = ${reg.ECR.fields.CEL}\n` +
           `[RP ] Receive Error Passive  = ${reg.ECR.fields.RP} (1: Rec. Err Counter reached Error Passive Level of 128)\n` +
           `[REC] Receive Error Counter  = ${reg.ECR.fields.REC}\n` +
           `[TEC] Transmit Error Counter = ${reg.ECR.fields.TEC}`
    });

    // 3. Add warnings if error counters are high
    if (reg.ECR.fields.TEC > 0) {
      reg.ECR.report.push({
        severityLevel: sevC.Warn,
        msg: `Transmit Error Counter (${reg.ECR.fields.TEC}) > 0: Transmit Errors seen recently.`
      });
    }
    if (reg.ECR.fields.REC > 0) {
      reg.ECR.report.push({
        severityLevel: sevC.Warn,
        msg: `Receive Error Counter (${reg.ECR.fields.REC}) > 0. Receive Errors seen recently.`
      });
    }
    if (reg.ECR.fields.RP === 1) {
      reg.ECR.report.push({
        severityLevel: sevC.Warn,
        msg: `Receive Error Passive flag is set. CAN controller is in error passive state for receive.`
      });
    }
  }

  // === PSR: PRT Status Register =========================================
  if ('PSR' in reg && reg.PSR.int32 !== undefined) {
    const regValue = reg.PSR.int32;

    // 0. Extend existing register structure
    reg.PSR.fields = {};
    reg.PSR.report = []; // Initialize report array

    // 1. Decode all individual bits of PSR register (M_CAN User Manual v3.3.1, pages 17-18)
    reg.PSR.fields.LEC   = getBits(regValue, 2, 0);    // Last Error Code (3 bits)
    reg.PSR.fields.ACT   = getBits(regValue, 4, 3);    // Activity (2 bits)
    reg.PSR.fields.EP    = getBits(regValue, 5, 5);    // Error Passive (1 bit)
    reg.PSR.fields.EW    = getBits(regValue, 6, 6);    // Error Warning (1 bit)
    reg.PSR.fields.BO    = getBits(regValue, 7, 7);    // Bus Off (1 bit)
    reg.PSR.fields.DLEC  = getBits(regValue, 10, 8);   // Data Phase Last Error Code (3 bits)
    reg.PSR.fields.RESI  = getBits(regValue, 11, 11);  // ESI flag of last received CAN FD message (1 bit)
    reg.PSR.fields.RBRS  = getBits(regValue, 12, 12);  // BRS flag of last received CAN FD message (1 bit)
    reg.PSR.fields.RFDF  = getBits(regValue, 13, 13);  // Received a CAN FD Message(1 bit)
    reg.PSR.fields.TDCV  = getBits(regValue, 20, 16);  // Transmitter Delay Compensation Value (5 bits)

    // 2. Generate human-readable register report
    reg.PSR.report.push({
      severityLevel: sevC.Info,
      msg: `PSR: ${reg.PSR.name_long} (0x${reg.PSR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[LEC ] Last Error Code Arb. Phase  = ${reg.PSR.fields.LEC} (0: No Error, 1: Stuff, 2: Form, 3: Ack, 4: Bit1, 5: Bit0, 6: CRC, 7: No Change)\n` +
           `[ACT ] Activity                    = ${reg.PSR.fields.ACT} (0: Synchronizing, 1: Idle, 2: Receiver, 3: Transmitter)\n` +
           `[EP  ] Error Passive               = ${reg.PSR.fields.EP}\n` +
           `[EQ  ] Error Warning               = ${reg.PSR.fields.EW}\n` +
           `[BO  ] Bus Off                     = ${reg.PSR.fields.BO}\n` +
           `[DLEC] Last Error Code Data Phase  = ${reg.PSR.fields.DLEC} (0: No Error, 1: Stuff, 2: Form, 3: Ack, 4: Bit1, 5: Bit0, 6: CRC, 7: No Change)\n` +
           `[RESI] ESI flag of last CAN FD msg = ${reg.PSR.fields.RESI}\n` +
           `[RBRS] BRS flag of last CAN FD msg = ${reg.PSR.fields.RBRS}\n` +
           `[RFDF] Received a CAN FD Message   = ${reg.PSR.fields.RFDF}\n` +
           `[TDCV] TDC Value (=TLD+SSP_offset) = ${reg.PSR.fields.TDCV} => ${reg.PSR.fields.TDCV*reg.general.clk_period} ns`
    });

    // 3. Add status-specific warnings/errors
    if (reg.PSR.fields.BO === 1) {
      reg.PSR.report.push({
        severityLevel: sevC.Warn,
        msg: `CAN controller is in Bus Off state`
      });
    }
    if (reg.PSR.fields.EP === 1) {
      reg.PSR.report.push({
        severityLevel: sevC.Warn,
        msg: `CAN controller is in Error Passive state`
      });
    }
    if (reg.PSR.fields.LEC > 0 && reg.PSR.fields.LEC < 7) {
      reg.PSR.report.push({
        severityLevel: sevC.Warn,
        msg: `Last Error Code (Arbitration Phase) indicates a recent error: ${reg.PSR.fields.LEC}`
      });
    }
    if (reg.PSR.fields.DLEC > 0 && reg.PSR.fields.DLEC < 7) {
      reg.PSR.report.push({
        severityLevel: sevC.Warn,
        msg: `Last Error Code (Data Phase) indicates a recent error: ${reg.PSR.fields.DLEC}`
      });
    }
  } // PSR

  // === IR: Interrupt Register =======================================
  if ('IR' in reg && reg.IR.int32 !== undefined) {
    const regValue = reg.IR.int32;

    // 0. Extend existing register structure
    reg.IR.fields = {};
    reg.IR.report = []; // Initialize report array

    // 1. Decode all individual bits of IR register (M_CAN User Manual v3.3.1, pages 20-24)
    reg.IR.fields.ARA  = getBits(regValue, 29, 29); // Access to Reserved Address
    reg.IR.fields.PED  = getBits(regValue, 28, 28); // Protocol Error in Data Phase
    reg.IR.fields.PEA  = getBits(regValue, 27, 27); // Protocol Error in Arbitration Phase
    reg.IR.fields.WDI  = getBits(regValue, 26, 26); // Watchdog Interrupt
    reg.IR.fields.BO   = getBits(regValue, 25, 25); // Bus_Off Status
    reg.IR.fields.EW   = getBits(regValue, 24, 24); // Warning Status
    reg.IR.fields.EP   = getBits(regValue, 23, 23); // Error Passive
    reg.IR.fields.ELO  = getBits(regValue, 22, 22); // Error Logging Overflow
    reg.IR.fields.BEU  = getBits(regValue, 21, 21); // Bit Error Uncorrected
    reg.IR.fields.BEC  = getBits(regValue, 20, 20); // Bit Error Corrected
    reg.IR.fields.DRX  = getBits(regValue, 19, 19); // Message stored to Dedicated RX Buffer
    reg.IR.fields.TOO  = getBits(regValue, 18, 18); // Timeout Occurred
    reg.IR.fields.MRAF = getBits(regValue, 17, 17); // Message RAM Access Failure
    reg.IR.fields.TSW  = getBits(regValue, 16, 16); // Timestamp Wraparound
    reg.IR.fields.TEFL = getBits(regValue, 15, 15); // Tx Event FIFO Element Lost
    reg.IR.fields.TEFF = getBits(regValue, 14, 14); // Tx Event FIFO Full
    reg.IR.fields.TEFW = getBits(regValue, 13, 13); // Tx Event FIFO Watermark Reached
    reg.IR.fields.TEFN = getBits(regValue, 12, 12); // Tx Event FIFO New Entry
    reg.IR.fields.TFE  = getBits(regValue, 11, 11); // Tx FIFO Empty
    reg.IR.fields.TCF  = getBits(regValue, 10, 10); // Transmission Cancellation Finished
    reg.IR.fields.TC   = getBits(regValue, 9, 9);   // Transmission Completed
    reg.IR.fields.HPM  = getBits(regValue, 8, 8);   // High Priority Message
    reg.IR.fields.RF1L = getBits(regValue, 7, 7);   // Rx FIFO 1 Message Lost
    reg.IR.fields.RF1F = getBits(regValue, 6, 6);   // Rx FIFO 1 Full
    reg.IR.fields.RF1W = getBits(regValue, 5, 5);   // Rx FIFO 1 Watermark Reached
    reg.IR.fields.RF1N = getBits(regValue, 4, 4);   // Rx FIFO 1 New Message
    reg.IR.fields.RF0L = getBits(regValue, 3, 3);   // Rx FIFO 0 Message Lost
    reg.IR.fields.RF0F = getBits(regValue, 2, 2);   // Rx FIFO 0 Full
    reg.IR.fields.RF0W = getBits(regValue, 1, 1);   // Rx FIFO 0 Watermark Reached
    reg.IR.fields.RF0N = getBits(regValue, 0, 0);   // Rx FIFO 0 New Message

    // 2. Generate human-readable register report
    reg.IR.report.push({
      severityLevel: sevC.Info,
      msg: `IR: ${reg.IR.name_long} (0x${reg.IR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[ARA ] Access to Reserved Address      = ${reg.IR.fields.ARA}\n` +
           `[PED ] Protocol Error Data Phase       = ${reg.IR.fields.PED}\n` +
           `[PEA ] Protocol Error Arbitration      = ${reg.IR.fields.PEA}\n` +
           `[WDI ] Watchdog Interrupt              = ${reg.IR.fields.WDI}\n` +
           `[BO  ] Bus_Off Status                  = ${reg.IR.fields.BO}\n` +
           `[EW  ] Warning Status                  = ${reg.IR.fields.EW}\n` +
           `[EP  ] Error Passive                   = ${reg.IR.fields.EP}\n` +
           `[ELO ] Error Logging Overflow          = ${reg.IR.fields.ELO}\n` +
           `[BEU ] Bit Error Uncorrected           = ${reg.IR.fields.BEU}\n` +
           `[BEC ] Bit Error Corrected             = ${reg.IR.fields.BEC}\n` +
           `[DRX ] Msg stored at Dedic. RX Buffer  = ${reg.IR.fields.DRX}\n` +
           `[TOO ] Timeout Occurred                = ${reg.IR.fields.TOO}\n` +
           `[MRAF] Message RAM Access Failure      = ${reg.IR.fields.MRAF}\n` +
           `[TSW ] Timestamp Wraparound            = ${reg.IR.fields.TSW}\n` +
           `[TEFL] Tx Event FIFO Element Lost      = ${reg.IR.fields.TEFL}\n` +
           `[TEFF] Tx Event FIFO Full              = ${reg.IR.fields.TEFF}\n` +
           `[TEFW] Tx Event FIFO Watermark Reached = ${reg.IR.fields.TEFW}\n` +
           `[TEFN] Tx Event FIFO New Entry         = ${reg.IR.fields.TEFN}\n` +
           `[TFE ] Tx FIFO Empty                   = ${reg.IR.fields.TFE}\n` +
           `[TCF ] Transmission Cancellation Fin.  = ${reg.IR.fields.TCF}\n` +
           `[TC  ] Transmission Completed          = ${reg.IR.fields.TC}\n` +
           `[HPM ] High Priority Message           = ${reg.IR.fields.HPM}\n` +
           `[RF1L] Rx FIFO 1 Message Lost          = ${reg.IR.fields.RF1L}\n` +
           `[RF1F] Rx FIFO 1 Full                  = ${reg.IR.fields.RF1F}\n` +
           `[RF1W] Rx FIFO 1 Watermark Reached     = ${reg.IR.fields.RF1W}\n` +
           `[RF1N] Rx FIFO 1 New Message           = ${reg.IR.fields.RF1N}\n` +
           `[RF0L] Rx FIFO 0 Message Lost          = ${reg.IR.fields.RF0L}\n` +
           `[RF0F] Rx FIFO 0 Full                  = ${reg.IR.fields.RF0F}\n` +
           `[RF0W] Rx FIFO 0 Watermark Reached     = ${reg.IR.fields.RF0W}\n` +
           `[RF0N] Rx FIFO 0 New Message           = ${reg.IR.fields.RF0N}`
    });
  } // IR

  // === IE: Interrupt Enable Register =======================================
  if ('IE' in reg && reg.IE.int32 !== undefined) {
    const regValue = reg.IE.int32;

    // 0. Extend existing register structure
    reg.IE.fields = {};
    reg.IE.report = []; // Initialize report array

    // 1. Decode all individual bits of IE register (M_CAN User Manual v3.3.1, pages 20-24)
    reg.IE.fields.ARAE  = getBits(regValue, 29, 29); // Access to Reserved Address
    reg.IE.fields.PEDE  = getBits(regValue, 28, 28); // Protocol Error in Data Phase
    reg.IE.fields.PEAE  = getBits(regValue, 27, 27); // Protocol Error in Arbitration Phase
    reg.IE.fields.WDIE  = getBits(regValue, 26, 26); // Watchdog Interrupt
    reg.IE.fields.BOE   = getBits(regValue, 25, 25); // Bus_Off Status
    reg.IE.fields.EWE   = getBits(regValue, 24, 24); // Warning Status
    reg.IE.fields.EPE   = getBits(regValue, 23, 23); // Error Passive
    reg.IE.fields.ELOE  = getBits(regValue, 22, 22); // Error Logging Overflow
    reg.IE.fields.BEUE  = getBits(regValue, 21, 21); // Bit Error Uncorrected
    reg.IE.fields.BECE  = getBits(regValue, 20, 20); // Bit Error Corrected
    reg.IE.fields.DRXE  = getBits(regValue, 19, 19); // Message stored to Dedicated RX Buffer
    reg.IE.fields.TOOE  = getBits(regValue, 18, 18); // Timeout Occurred
    reg.IE.fields.MRAFE = getBits(regValue, 17, 17); // Message RAM Access Failure
    reg.IE.fields.TSWE  = getBits(regValue, 16, 16); // Timestamp Wraparound
    reg.IE.fields.TEFLE = getBits(regValue, 15, 15); // Tx Event FIFO Element Lost
    reg.IE.fields.TEFFE = getBits(regValue, 14, 14); // Tx Event FIFO Full
    reg.IE.fields.TEFWE = getBits(regValue, 13, 13); // Tx Event FIFO Watermark Reached
    reg.IE.fields.TEFNE = getBits(regValue, 12, 12); // Tx Event FIFO New Entry
    reg.IE.fields.TFEE  = getBits(regValue, 11, 11); // Tx FIFO Empty
    reg.IE.fields.TCFE  = getBits(regValue, 10, 10); // Transmission Cancellation Finished
    reg.IE.fields.TCE   = getBits(regValue, 9, 9);   // Transmission Completed
    reg.IE.fields.HPME  = getBits(regValue, 8, 8);   // High Priority Message
    reg.IE.fields.RF1LE = getBits(regValue, 7, 7);   // Rx FIFO 1 Message Lost
    reg.IE.fields.RF1FE = getBits(regValue, 6, 6);   // Rx FIFO 1 Full
    reg.IE.fields.RF1WE = getBits(regValue, 5, 5);   // Rx FIFO 1 Watermark Reached
    reg.IE.fields.RF1NE = getBits(regValue, 4, 4);   // Rx FIFO 1 New Message
    reg.IE.fields.RF0LE = getBits(regValue, 3, 3);   // Rx FIFO 0 Message Lost
    reg.IE.fields.RF0FE = getBits(regValue, 2, 2);   // Rx FIFO 0 Full
    reg.IE.fields.RF0WE = getBits(regValue, 1, 1);   // Rx FIFO 0 Watermark Reached
    reg.IE.fields.RF0NE = getBits(regValue, 0, 0);   // Rx FIFO 0 New Message

    // 2. Generate human-readable register report
    reg.IE.report.push({
      severityLevel: sevC.Info,
      msg: `IE: ${reg.IE.name_long} (0x${reg.IE.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[ARAE ] Access to Reserved Address      = ${reg.IE.fields.ARAE}\n` +
           `[PEDE ] Protocol Error Data Phase       = ${reg.IE.fields.PEDE}\n` +
           `[PEAE ] Protocol Error Arbitration      = ${reg.IE.fields.PEAE}\n` +
           `[WDIE ] Watchdog Interrupt              = ${reg.IE.fields.WDIE}\n` +
           `[BOE  ] Bus_Off Status                  = ${reg.IE.fields.BOE}\n` +
           `[EWE  ] Warning Status                  = ${reg.IE.fields.EWE}\n` +
           `[EPE  ] Error Passive                   = ${reg.IE.fields.EPE}\n` +
           `[ELOE ] Error Logging Overflow          = ${reg.IE.fields.ELOE}\n` +
           `[BEUE ] Bit Error Uncorrected           = ${reg.IE.fields.BEUE}\n` +
           `[BECE ] Bit Error Corrected             = ${reg.IE.fields.BECE}\n` +
           `[DRXE ] Msg stored at Dedic. RX Buffer  = ${reg.IE.fields.DRXE}\n` +
           `[TOOE ] Timeout Occurred                = ${reg.IE.fields.TOOE}\n` +
           `[MRAFE] Message RAM Access Failure      = ${reg.IE.fields.MRAFE}\n` +
           `[TSWE ] Timestamp Wraparound            = ${reg.IE.fields.TSWE}\n` +
           `[TEFLE] Tx Event FIFO Element Lost      = ${reg.IE.fields.TEFLE}\n` +
           `[TEFFE] Tx Event FIFO Full              = ${reg.IE.fields.TEFFE}\n` +
           `[TEFWE] Tx Event FIFO Watermark Reached = ${reg.IE.fields.TEFWE}\n` +
           `[TEFNE] Tx Event FIFO New Entry         = ${reg.IE.fields.TEFNE}\n` +
           `[TFEE ] Tx FIFO Empty                   = ${reg.IE.fields.TFEE}\n` +
           `[TCFE ] Transmission Cancellation Fin.  = ${reg.IE.fields.TCFE}\n` +
           `[TCE  ] Transmission Completed          = ${reg.IE.fields.TCE}\n` +
           `[HPME ] High Priority Message           = ${reg.IE.fields.HPME}\n` +
           `[RF1LE] Rx FIFO 1 Message Lost          = ${reg.IE.fields.RF1LE}\n` +
           `[RF1FE] Rx FIFO 1 Full                  = ${reg.IE.fields.RF1FE}\n` +
           `[RF1WE] Rx FIFO 1 Watermark Reached     = ${reg.IE.fields.RF1WE}\n` +
           `[RF1NE] Rx FIFO 1 New Message           = ${reg.IE.fields.RF1NE}\n` +
           `[RF0LE] Rx FIFO 0 Message Lost          = ${reg.IE.fields.RF0LE}\n` +
           `[RF0FE] Rx FIFO 0 Full                  = ${reg.IE.fields.RF0FE}\n` +
           `[RF0WE] Rx FIFO 0 Watermark Reached     = ${reg.IE.fields.RF0WE}\n` +
           `[RF0NE] Rx FIFO 0 New Message           = ${reg.IE.fields.RF0NE}`
    });
  } // IE

  // === ILS: Interrupt Line Select Register =======================================
  if ('ILS' in reg && reg.ILS.int32 !== undefined) {
    const regValue = reg.ILS.int32;

    // 0. Extend existing register structure
    reg.ILS.fields = {};
    reg.ILS.report = []; // Initialize report array

    // 1. Decode all individual bits of IE register (M_CAN User Manual v3.3.1, pages 20-24)
    reg.ILS.fields.ARAL  = getBits(regValue, 29, 29); // Access to Reserved Address
    reg.ILS.fields.PEDL  = getBits(regValue, 28, 28); // Protocol Error in Data Phase
    reg.ILS.fields.PEAL  = getBits(regValue, 27, 27); // Protocol Error in Arbitration Phase
    reg.ILS.fields.WDIL  = getBits(regValue, 26, 26); // Watchdog Interrupt
    reg.ILS.fields.BOL   = getBits(regValue, 25, 25); // Bus_Off Status
    reg.ILS.fields.EWL   = getBits(regValue, 24, 24); // Warning Status
    reg.ILS.fields.EPL   = getBits(regValue, 23, 23); // Error Passive
    reg.ILS.fields.ELOL  = getBits(regValue, 22, 22); // Error Logging Overflow
    reg.ILS.fields.BEUL  = getBits(regValue, 21, 21); // Bit Error Uncorrected
    reg.ILS.fields.BECL  = getBits(regValue, 20, 20); // Bit Error Corrected
    reg.ILS.fields.DRXL  = getBits(regValue, 19, 19); // Message stored to Dedicated RX Buffer
    reg.ILS.fields.TOOL  = getBits(regValue, 18, 18); // Timeout Occurred
    reg.ILS.fields.MRAFL = getBits(regValue, 17, 17); // Message RAM Access Failure
    reg.ILS.fields.TSWL  = getBits(regValue, 16, 16); // Timestamp Wraparound
    reg.ILS.fields.TEFLL = getBits(regValue, 15, 15); // Tx Event FIFO Element Lost
    reg.ILS.fields.TEFFL = getBits(regValue, 14, 14); // Tx Event FIFO Full
    reg.ILS.fields.TEFWL = getBits(regValue, 13, 13); // Tx Event FIFO Watermark Reached
    reg.ILS.fields.TEFNL = getBits(regValue, 12, 12); // Tx Event FIFO New Entry
    reg.ILS.fields.TFEL  = getBits(regValue, 11, 11); // Tx FIFO Empty
    reg.ILS.fields.TCFL  = getBits(regValue, 10, 10); // Transmission Cancellation Finished
    reg.ILS.fields.TCL   = getBits(regValue, 9, 9);   // Transmission Completed
    reg.ILS.fields.HPML  = getBits(regValue, 8, 8);   // High Priority Message
    reg.ILS.fields.RF1LL = getBits(regValue, 7, 7);   // Rx FIFO 1 Message Lost
    reg.ILS.fields.RF1FL = getBits(regValue, 6, 6);   // Rx FIFO 1 Full
    reg.ILS.fields.RF1WL = getBits(regValue, 5, 5);   // Rx FIFO 1 Watermark Reached
    reg.ILS.fields.RF1NL = getBits(regValue, 4, 4);   // Rx FIFO 1 New Message
    reg.ILS.fields.RF0LL = getBits(regValue, 3, 3);   // Rx FIFO 0 Message Lost
    reg.ILS.fields.RF0FL = getBits(regValue, 2, 2);   // Rx FIFO 0 Full
    reg.ILS.fields.RF0WL = getBits(regValue, 1, 1);   // Rx FIFO 0 Watermark Reached
    reg.ILS.fields.RF0NL = getBits(regValue, 0, 0);   // Rx FIFO 0 New Message

    // 2. Generate human-readable register report
    reg.ILS.report.push({
      severityLevel: sevC.Info,
      msg: `ILS: ${reg.ILS.name_long} (0x${reg.ILS.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[ARAL ] Access to Reserved Address      = ${reg.ILS.fields.ARAL}\n` +
           `[PEDL ] Protocol Error Data Phase       = ${reg.ILS.fields.PEDL}\n` +
           `[PEAL ] Protocol Error Arbitration      = ${reg.ILS.fields.PEAL}\n` +
           `[WDIL ] Watchdog Interrupt              = ${reg.ILS.fields.WDIL}\n` +
           `[BOL  ] Bus_Off Status                  = ${reg.ILS.fields.BOL}\n` +
           `[EWL  ] Warning Status                  = ${reg.ILS.fields.EWL}\n` +
           `[EPL  ] Error Passive                   = ${reg.ILS.fields.EPL}\n` +
           `[ELOL ] Error Logging Overflow          = ${reg.ILS.fields.ELOL}\n` +
           `[BEUL ] Bit Error Uncorrected           = ${reg.ILS.fields.BEUL}\n` +
           `[BECL ] Bit Error Corrected             = ${reg.ILS.fields.BECL}\n` +
           `[DRXL ] Msg stored at Dedic. RX Buffer  = ${reg.ILS.fields.DRXL}\n` +
           `[TOOL ] Timeout Occurred                = ${reg.ILS.fields.TOOL}\n` +
           `[MRAFL] Message RAM Access Failure      = ${reg.ILS.fields.MRAFL}\n` +
           `[TSWL ] Timestamp Wraparound            = ${reg.ILS.fields.TSWL}\n` +
           `[TEFLL] Tx Event FIFO Element Lost      = ${reg.ILS.fields.TEFLL}\n` +
           `[TEFFL] Tx Event FIFO Full              = ${reg.ILS.fields.TEFFL}\n` +
           `[TEFWL] Tx Event FIFO Watermark Reached = ${reg.ILS.fields.TEFWL}\n` +
           `[TEFNL] Tx Event FIFO New Entry         = ${reg.ILS.fields.TEFNL}\n` +
           `[TFEL ] Tx FIFO Empty                   = ${reg.ILS.fields.TFEL}\n` +
           `[TCFL ] Transmission Cancellation Fin.  = ${reg.ILS.fields.TCFL}\n` +
           `[TCL  ] Transmission Completed          = ${reg.ILS.fields.TCL}\n` +
           `[HPML ] High Priority Message           = ${reg.ILS.fields.HPML}\n` +
           `[RF1LL] Rx FIFO 1 Message Lost          = ${reg.ILS.fields.RF1LL}\n` +
           `[RF1FL] Rx FIFO 1 Full                  = ${reg.ILS.fields.RF1FL}\n` +
           `[RF1WL] Rx FIFO 1 Watermark Reached     = ${reg.ILS.fields.RF1WL}\n` +
           `[RF1NL] Rx FIFO 1 New Message           = ${reg.ILS.fields.RF1NL}\n` +
           `[RF0LL] Rx FIFO 0 Message Lost          = ${reg.ILS.fields.RF0LL}\n` +
           `[RF0FL] Rx FIFO 0 Full                  = ${reg.ILS.fields.RF0FL}\n` +
           `[RF0WL] Rx FIFO 0 Watermark Reached     = ${reg.ILS.fields.RF0WL}\n` +
           `[RF0NL] Rx FIFO 0 New Message           = ${reg.ILS.fields.RF0NL}`
    });
  } // ILS

  // Horziontal & Bit-wise view of IR Flags and IE 
  //       
  //     A P P W          E
  //     R E A D    B E E L
  //     A D E I    O W P O
  // IR: 0 0 0 0    1 1 1 1  ...
  // IE  0 0 0 0    0 0 1 1  ...
  if (reg.IE !== undefined && reg.IR !== undefined) {
    // Use IR bit names and order for both IR and IE
    const irBitNames = [
      "ARA", "PED", "PEA", "WDI", "BO", "EW", "EP", "ELO", "BEU", "BEC", "DRX", "TOO", "MRAF", "TSW",
      "TEFL", "TEFF", "TEFW", "TEFN", "TFE", "TCF", "TC", "HPM", "RF1L", "RF1F", "RF1W", "RF1N", "RF0L", "RF0F", "RF0W", "RF0N"
    ];
    // Build vertical bit name header
    let header = "    ";
    const maxLen = Math.max(...irBitNames.map(n => n.length));
    // Bottom align: print from top, but pad each name at the top so the last char is at the bottom
    for (let row = 0; row < maxLen; row++) {
      let line = "";
      for (let i = 0; i < irBitNames.length; i++) {
        const idx = row - (maxLen - irBitNames[i].length);
        line += (idx >= 0 && idx < irBitNames[i].length ? irBitNames[i][idx] : " ") + " ";
        if ((i + 1) % 4 === 0 && i !== irBitNames.length - 1) line += "  ";
      }
      header += line + "\n    ";
    }
    header = header.trimEnd() + "\n";
    // Build IR and IE bit value lines
    let irLine = "IR: ";
    let ieLine = "IE: ";
    for (let i = 0; i < irBitNames.length; i++) {
      const irVal = reg.IR.fields[irBitNames[i]] !== undefined ? reg.IR.fields[irBitNames[i]] : " ";
      const ieVal = reg.IE.fields[irBitNames[i]+"E"] !== undefined ? reg.IE.fields[irBitNames[i]+"E"] : " ";
      irLine += irVal + " ";
      ieLine += ieVal + " ";
      if ((i + 1) % 4 === 0 && i !== irBitNames.length - 1) {
        irLine += "  ";
        ieLine += "  ";
      }
    }
    irLine = irLine.trimEnd() + "\n";
    ieLine = ieLine.trimEnd(); // no new line, since this is the bottom line
    // Add to report
    reg.IE.report.push({
      severityLevel: sevC.Info,
      msg: `IR and IE - combined bit wise view\n`+ header + irLine + ieLine
    });
  } // IR and IE

  // === ILE: Interrupt Line Enable Register =============================
  if ('ILE' in reg && reg.ILE.int32 !== undefined) {
    const regValue = reg.ILE.int32;

    // 0. Extend existing register structure
    reg.ILE.fields = {};
    reg.ILE.report = [];

    // 1. Decode all individual bits of ILE register (M_CAN User Manual v3.3.1, page 26)
    reg.ILE.fields.EINT1 = getBits(regValue, 1, 1); // Enable Interrupt Line 1
    reg.ILE.fields.EINT0 = getBits(regValue, 0, 0); // Enable Interrupt Line 0

    // 2. Generate human-readable register report
    reg.ILE.report.push({
      severityLevel: sevC.Info,
  msg: `ILE: ${reg.ILE.name_long} (0x${reg.ILE.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[EINT0] Enable Interrupt Line 0 = ${reg.ILE.fields.EINT0}\n` +
           `[EINT1] Enable Interrupt Line 1 = ${reg.ILE.fields.EINT1}`
    });
  } // ILE

  // === GFC: Global Filter Configuration Register =======================
  if ('GFC' in reg && reg.GFC.int32 !== undefined) {
    const regValue = reg.GFC.int32;

    // 0. Extend existing register structure
    reg.GFC.fields = {};
    reg.GFC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 27)
    reg.GFC.fields.ANFS = getBits(regValue, 5, 4); // Accept Non-matching Frames Standard (2 bits)
    reg.GFC.fields.ANFE = getBits(regValue, 3, 2); // Accept Non-matching Frames Extended (2 bits)
    reg.GFC.fields.RRFS = getBits(regValue, 1, 1); // Reject Remote Frames Standard
    reg.GFC.fields.RRFE = getBits(regValue, 0, 0); // Reject Remote Frames Extended

    // 2. Generate human-readable register report
    reg.GFC.report.push({
      severityLevel: sevC.Info,
      msg: `GFC: ${reg.GFC.name_long} (0x${reg.GFC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[ANFS] Accept Non-matching Frames Standard   = ${reg.GFC.fields.ANFS}\n` +
           `[ANFE] Accept Non-matching Frames Extended   = ${reg.GFC.fields.ANFE}\n` +
           `[RRFS] Reject Remote Frames Standard         = ${reg.GFC.fields.RRFS}\n` +
           `[RRFE] Reject Remote Frames Extended         = ${reg.GFC.fields.RRFE}`
          });
  } // GFC

  // === SIDFC: Standard ID Filter Configuration Register ================
  if ('SIDFC' in reg && reg.SIDFC.int32 !== undefined) {
    const regValue = reg.SIDFC.int32;

    // 0. Extend existing register structure
    reg.SIDFC.fields = {};
    reg.SIDFC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 28)
    reg.SIDFC.fields.LSS   = getBits(regValue, 23, 16); // List Size Standard (8 bits)
    reg.SIDFC.fields.FLSSA = getBits(regValue, 15,  2); // Filter List Standard Start Address (14 bits)

    // 2. Generate human-readable register report
    reg.SIDFC.report.push({
      severityLevel: sevC.Info,
      msg: `SIDFC: ${reg.SIDFC.name_long} (0x${reg.SIDFC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[LSS  ] List Size Standard            = ${reg.SIDFC.fields.LSS}\n` +
           `[FLSSA] Filter List Std Start Address = 0x${(reg.SIDFC.fields.FLSSA << 2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });
  } // SIDFC

  // === XIDFC: Extended ID Filter Configuration Register ================
  if ('XIDFC' in reg && reg.XIDFC.int32 !== undefined) {
    const regValue = reg.XIDFC.int32;

    // 0. Extend existing register structure
    reg.XIDFC.fields = {};
    reg.XIDFC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 28)
    reg.XIDFC.fields.LSE   = getBits(regValue, 22, 16); // List Size Extended (7 bits)
    reg.XIDFC.fields.FLESA = getBits(regValue, 15,  2); // Filter List Extended Start Address (14 bits)

    // 2. Generate human-readable register report
    reg.XIDFC.report.push({
      severityLevel: sevC.Info,
      msg: `XIDFC: ${reg.XIDFC.name_long} (0x${reg.XIDFC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[LSE  ] List Size Extended            = ${reg.XIDFC.fields.LSE}\n` +
           `[FLESA] Filter List Ext Start Address = 0x${(reg.XIDFC.fields.FLESA << 2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });
  } // XIDFC

  // === XIDAM: Extended ID AND Mask Register ============================
  if ('XIDAM' in reg && reg.XIDAM.int32 !== undefined) {
    const regValue = reg.XIDAM.int32;

    // 0. Extend existing register structure
    reg.XIDAM.fields = {};
    reg.XIDAM.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 29)
    reg.XIDAM.fields.XIDAM = getBits(regValue, 28, 0); // Extended ID AND Mask (29 bits)

    // 2. Generate human-readable register report
    reg.XIDAM.report.push({
      severityLevel: sevC.Info,
      msg: `XIDAM: ${reg.XIDAM.name_long} (0x${reg.XIDAM.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[XIDAM] Extended ID AND Mask = 0x${reg.XIDAM.fields.XIDAM.toString(16).toUpperCase().padStart(8, '0')} (use: message ID AND this mask, 1...1 => no impact)`
    });
  } // XIDAM

  // === HPMS: High Priority Message Status Register ======================
  if ('HPMS' in reg && reg.HPMS.int32 !== undefined) {
    const regValue = reg.HPMS.int32;

    // 0. Extend existing register structure
    reg.HPMS.fields = {};
    reg.HPMS.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 29)
    reg.HPMS.fields.FLST = getBits(regValue, 15, 15); // Filter List (1 bit)
    reg.HPMS.fields.FIDX = getBits(regValue, 14,  8);  // Filter Index (7 bits)
    reg.HPMS.fields.MSI  = getBits(regValue,  7,  6);   // Message Storage Indicator (2 bits)
    reg.HPMS.fields.BIDX = getBits(regValue,  5,  0);   // Buffer Index (6 bits)

    // 2. Generate human-readable register report
    reg.HPMS.report.push({
      severityLevel: sevC.Info,
      msg: `HPMS: ${reg.HPMS.name_long} (0x${reg.HPMS.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[FLST] Filter List               = ${reg.HPMS.fields.FLST} (0: Std, 1: Ext)\n` +
           `[FIDX] Filter Index              = ${reg.HPMS.fields.FIDX}\n` +
           `[MSI ] Message Storage Indicator = ${reg.HPMS.fields.MSI} (0: no FIFO sel, 1: FIFO msg lost, 2: Msg in FIFO0, 3: Msg in FIFO1)\n` +
           `[BIDX] Buffer Index              = ${reg.HPMS.fields.BIDX} (only valid when MSI=2 or 3)`
    });
  } // HPMS

  // === NDAT1: New Data 1 Register =======================================
  if ('NDAT1' in reg && reg.NDAT1.int32 !== undefined) {
    const regValue = reg.NDAT1.int32;

    // 0. Extend existing register structure
    reg.NDAT1.fields = {};
    reg.NDAT1.report = [];

    // 1. Decode all individual bits (M_CAN User Manual v3.3.1, page 30)
    for (let i = 0; i < 32; i++) {
      reg.NDAT1.fields[`ND${i}`] = getBits(regValue, i, i); // New Data flags for RX Buffer 0-31
    }

    // 2. Generate human-readable register report
    // 31 ..                          0
    // 0 0 0 0   1 0 1 0   ...  1 0 0 0
  let ndat1Msg = `NDAT1: ${reg.NDAT1.name_long} (0x${reg.NDAT1.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n`;
    // Binary headline and bitwise value
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += reg.NDAT1.fields[`ND${i}`];
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.NDAT1.report.push({
      severityLevel: sevC.Info,
      msg: `NDAT1: ${reg.NDAT1.name_long} (0x${reg.NDAT1.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  } // NDAT1

  // === NDAT2: New Data 2 Register =======================================
  if ('NDAT2' in reg && reg.NDAT2.int32 !== undefined) {
    const regValue = reg.NDAT2.int32;

    // 0. Extend existing register structure
    reg.NDAT2.fields = {};
    reg.NDAT2.report = [];

    // 1. Decode all individual bits (M_CAN User Manual v3.3.1, page 30)
    for (let i = 0; i < 32; i++) {
      reg.NDAT2.fields[`ND${i+32}`] = getBits(regValue, i, i); // New Data flags for RX Buffer 32-63
    }

    // 2. Generate human-readable register report
  let ndat2Msg = `NDAT2: ${reg.NDAT2.name_long} (0x${reg.NDAT2.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n`;
    // Binary headline and bitwise value
    let headline2 = "Bit: 63                  55                  47                  39             32\n";
    let binaryLine2 = "     ";
    for (let i = 63; i >= 32; i--) {
      binaryLine2 += reg.NDAT2.fields[`ND${i}`];
      if (i > 32) binaryLine2 += " ";
      if (i % 4 === 0 && i > 32) binaryLine2 += "  ";
    }
    reg.NDAT2.report.push({
      severityLevel: sevC.Info,
      msg: `NDAT2: ${reg.NDAT2.name_long} (0x${reg.NDAT2.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline2 + binaryLine2
    });
  } // NDAT2

  // === RXF0C: Rx FIFO 0 Configuration Register =========================
  if ('RXF0C' in reg && reg.RXF0C.int32 !== undefined) {
    const regValue = reg.RXF0C.int32;

    // 0. Extend existing register structure
    reg.RXF0C.fields = {};
    reg.RXF0C.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 31)
    reg.RXF0C.fields.F0OM = getBits(regValue, 31, 31); // FIFO 0 Operation Mode (1 bit)
    reg.RXF0C.fields.F0WM = getBits(regValue, 30, 24); // Rx FIFO 0 Watermark (7 bits)
    reg.RXF0C.fields.F0S  = getBits(regValue, 22, 16); // Rx FIFO 0 Size (6 bits)
    reg.RXF0C.fields.F0SA = getBits(regValue, 15,  2); // Rx FIFO 0 Start Address (14 bits)

    // 2. Generate human-readable register report
    reg.RXF0C.report.push({
      severityLevel: sevC.Info,
      msg: `RXF0C: ${reg.RXF0C.name_long} (0x${reg.RXF0C.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[F0OM] RX FIFO 0 Operation Mode = ${reg.RXF0C.fields.F0OM} (0: blocking, 1: overwrite)\n` +
           `[F0WM] Rx FIFO 0 Watermark      = ${reg.RXF0C.fields.F0WM} (0: watermard disabled)\n` +
           `[F0S ] Rx FIFO 0 Size           = ${reg.RXF0C.fields.F0S}\n` +
           `[F0SA] Rx FIFO 0 Start Address  = 0x${(reg.RXF0C.fields.F0SA<<2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });
  } // RXF0C

  // === RXF0S: Rx FIFO 0 Status Register ================================
  if ('RXF0S' in reg && reg.RXF0S.int32 !== undefined) {
    const regValue = reg.RXF0S.int32;

    // 0. Extend existing register structure
    reg.RXF0S.fields = {};
    reg.RXF0S.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 32)
    reg.RXF0S.fields.RF0L = getBits(regValue, 25, 25); // Rx FIFO 0 Message Lost (1 bit)
    reg.RXF0S.fields.F0F  = getBits(regValue, 24, 24); // Rx FIFO 0 Full (1 bit)
    reg.RXF0S.fields.F0PI = getBits(regValue, 21, 16); // Rx FIFO 0 Put Index (6 bits)
    reg.RXF0S.fields.F0GI = getBits(regValue, 13,  8); // Rx FIFO 0 Get Index (6 bits)
    reg.RXF0S.fields.F0FL = getBits(regValue,  6,  0); // Rx FIFO 0 Fill Level (7 bits)

    // 2. Generate human-readable register report
    reg.RXF0S.report.push({
      severityLevel: sevC.Info,
      msg: `RXF0S: ${reg.RXF0S.name_long} (0x${reg.RXF0S.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[RF0L] Rx FIFO 0 Message Lost = ${reg.RXF0S.fields.RF0L}\n` +
           `[F0F ] Rx FIFO 0 Full         = ${reg.RXF0S.fields.F0F}\n` +
           `[F0PI] Rx FIFO 0 Put Index    = ${reg.RXF0S.fields.F0PI}\n` +
           `[F0GI] Rx FIFO 0 Get Index    = ${reg.RXF0S.fields.F0GI}\n` +
           `[F0FL] Rx FIFO 0 Fill Level   = ${reg.RXF0S.fields.F0FL}`
    });
  } // RXF0S

  // === RXF0A: Rx FIFO 0 Acknowledge Register ===========================
  if ('RXF0A' in reg && reg.RXF0A.int32 !== undefined) {
    const regValue = reg.RXF0A.int32;

    // 0. Extend existing register structure
    reg.RXF0A.fields = {};
    reg.RXF0A.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 33)
    reg.RXF0A.fields.F0AI = getBits(regValue, 5, 0); // Rx FIFO 0 Acknowledge Index (6 bits)

    // 2. Generate human-readable register report
    reg.RXF0A.report.push({
      severityLevel: sevC.Info,
      msg: `RXF0A: ${reg.RXF0A.name_long} (0x${reg.RXF0A.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[F0AI] Rx FIFO 0 Acknowledge Index = ${reg.RXF0A.fields.F0AI}`
    });
  } // RXF0A

  // === RXBC: Rx Buffer Configuration Register =========================
  if ('RXBC' in reg && reg.RXBC.int32 !== undefined) {
    const regValue = reg.RXBC.int32;

    // 0. Extend existing register structure
    reg.RXBC.fields = {};
    reg.RXBC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 33)
    reg.RXBC.fields.RBSA = getBits(regValue, 15, 2); // Rx Buffer Start Address (14 bits)

    // 2. Generate human-readable register report
    reg.RXBC.report.push({
      severityLevel: sevC.Info,
      msg: `RXBC: ${reg.RXBC.name_long} (0x${reg.RXBC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[RBSA] Rx Buffer Start Address = 0x${(reg.RXBC.fields.RBSA<<2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });
  } // RXBC

  // === RXF1C: Rx FIFO 1 Configuration Register =========================
  if ('RXF1C' in reg && reg.RXF1C.int32 !== undefined) {
    const regValue = reg.RXF1C.int32;

    // 0. Extend existing register structure
    reg.RXF1C.fields = {};
    reg.RXF1C.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 31)
  reg.RXF1C.fields.F1OM = getBits(regValue, 31, 31); // FIFO 1 Operation Mode (1 bit)
  reg.RXF1C.fields.F1WM = getBits(regValue, 30, 24); // Rx FIFO 1 Watermark (7 bits)
  reg.RXF1C.fields.F1S  = getBits(regValue, 21, 16); // Rx FIFO 1 Size (6 bits)
  reg.RXF1C.fields.F1SA = getBits(regValue, 15,  2); // Rx FIFO 1 Start Address (14 bits)

    // 2. Generate human-readable register report
    reg.RXF1C.report.push({
      severityLevel: sevC.Info,
      msg: `RXF1C: ${reg.RXF1C.name_long} (0x${reg.RXF1C.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[F1OM] Rx FIFO 1 Operation Mode = ${reg.RXF1C.fields.F1OM}\n` +
           `[F1WM] Rx FIFO 1 Watermark      = ${reg.RXF1C.fields.F1WM}\n` +
           `[F1S ] Rx FIFO 1 Size           = ${reg.RXF1C.fields.F1S}\n` +
           `[F1SA] Rx FIFO 1 Start Address  = 0x${(reg.RXF1C.fields.F1SA<<2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });
  } // RXF1C

  // === RXF1S: Rx FIFO 1 Status Register ================================
  if ('RXF1S' in reg && reg.RXF1S.int32 !== undefined) {
    const regValue = reg.RXF1S.int32;

    // 0. Extend existing register structure
    reg.RXF1S.fields = {};
    reg.RXF1S.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 32)
    reg.RXF1S.fields.RF1L = getBits(regValue, 25, 25); // Rx FIFO 1 Message Lost (1 bit)
    reg.RXF1S.fields.F1F  = getBits(regValue, 24, 24); // Rx FIFO 1 Full (1 bit)
    reg.RXF1S.fields.F1PI = getBits(regValue, 21, 16); // Rx FIFO 1 Put Index (6 bits)
    reg.RXF1S.fields.F1GI = getBits(regValue, 13,  8); // Rx FIFO 1 Get Index (6 bits)
    reg.RXF1S.fields.F1FL = getBits(regValue,  6,  0); // Rx FIFO 1 Fill Level (7 bits)

    // 2. Generate human-readable register report
    reg.RXF1S.report.push({
      severityLevel: sevC.Info,
      msg: `RXF1S: ${reg.RXF1S.name_long} (0x${reg.RXF1S.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[F1FL] Rx FIFO 1 Fill Level   = ${reg.RXF1S.fields.F1FL}\n` +
           `[F1GI] Rx FIFO 1 Get Index    = ${reg.RXF1S.fields.F1GI}\n` +
           `[F1PI] Rx FIFO 1 Put Index    = ${reg.RXF1S.fields.F1PI}\n` +
           `[F1F ] Rx FIFO 1 Full         = ${reg.RXF1S.fields.F1F}\n` +
           `[RF1L] Rx FIFO 1 Message Lost = ${reg.RXF1S.fields.RF1L}`
    });
  } // RXF1S

  // === RXF1A: Rx FIFO 1 Acknowledge Register ===========================
  if ('RXF1A' in reg && reg.RXF1A.int32 !== undefined) {
    const regValue = reg.RXF1A.int32;

    // 0. Extend existing register structure
    reg.RXF1A.fields = {};
    reg.RXF1A.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 33)
  reg.RXF1A.fields.F1AI = getBits(regValue, 5, 0); // Rx FIFO 1 Acknowledge Index (6 bits)

    // 2. Generate human-readable register report
    reg.RXF1A.report.push({
      severityLevel: sevC.Info,
      msg: `RXF1A: ${reg.RXF1A.name_long} (0x${reg.RXF1A.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[F1AI] Rx FIFO 1 Acknowledge Index = ${reg.RXF1A.fields.F1AI}`
    });
  } // RXF1A

  // === RXESC: Rx Buffer/FIFO Element Size Configuration Register =======
  if ('RXESC' in reg && reg.RXESC.int32 !== undefined) {
    const regValue = reg.RXESC.int32;

    // 0. Extend existing register structure
    reg.RXESC.fields = {};
    reg.RXESC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 36)
    reg.RXESC.fields.RBDS = getBits(regValue, 10, 8); // Rx Buffer Data Field Size (3 bits)
    reg.RXESC.fields.F1DS = getBits(regValue, 6, 4); // Rx FIFO 1 Data Field Size (3 bits)
    reg.RXESC.fields.F0DS = getBits(regValue, 3, 0); // Rx FIFO 0 Data Field Size (3 bits)

    // 2. Generate human-readable register report (higher order bits first)
    reg.RXESC.report.push({
      severityLevel: sevC.Info,
      msg: `RXESC: ${reg.RXESC.name_long} (0x${reg.RXESC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[RBDS] Rx Buffer Data Field Size = ${reg.RXESC.fields.RBDS} (= ${decodeConfiguredDataFieldSizeInByte(reg.RXESC.fields.RBDS)} bytes)\n` +
           `[F1DS] Rx FIFO 1 Data Field Size = ${reg.RXESC.fields.F1DS} (= ${decodeConfiguredDataFieldSizeInByte(reg.RXESC.fields.F1DS)} bytes)\n` +
           `[F0DS] Rx FIFO 0 Data Field Size = ${reg.RXESC.fields.F0DS} (= ${decodeConfiguredDataFieldSizeInByte(reg.RXESC.fields.F0DS)} bytes)`
    });
  } // RXESC

  // === TXBC: Tx Buffer Configuration Register ==========================
  if ('TXBC' in reg && reg.TXBC.int32 !== undefined) {
    const regValue = reg.TXBC.int32;

    // 0. Extend existing register structure
    reg.TXBC.fields = {};
    reg.TXBC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 37)
    reg.TXBC.fields.TFQM = getBits(regValue, 30, 30); // Tx FIFO/Queue Mode (1 bit)
    reg.TXBC.fields.TFQS = getBits(regValue, 29, 24); // Tx FIFO/Queue Size (6 bits)
    reg.TXBC.fields.NDTB = getBits(regValue, 21, 16); // Number of Dedicated Transmit Buffers (7 bits)
    reg.TXBC.fields.TBSA = getBits(regValue, 15,  2); // Tx Buffers Start Address (14 bits)

    // 2. Generate human-readable register report (higher order bits first)
    reg.TXBC.report.push({
      severityLevel: sevC.Info,
      msg: `TXBC: ${reg.TXBC.name_long} (0x${reg.TXBC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TFQM] Tx FIFO/Queue Mode                = ${reg.TXBC.fields.TFQM} (0: FIFO, 1: Queue)\n` +
           `[TFQS] Tx FIFO/Queue Size                = ${reg.TXBC.fields.TFQS}\n` +
           `[NDTB] Number of Dedicated Tx Buffers    = ${reg.TXBC.fields.NDTB}\n` +
           `[TBSA] Tx Buffers Start Address (byte)   = 0x${(reg.TXBC.fields.TBSA<<2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });

    // check if sum of Tx FIFO/Queue Size and Number of Dedicated Tx Buffers exceeds maximum
    if ((reg.TXBC.fields.TFQS + reg.TXBC.fields.NDTB) > 32) {
      reg.TXBC.report.push({
        severityLevel: sevC.Error,
        msg: `TXBC: Sum of Tx FIFO/Queue Size (${reg.TXBC.fields.TFQS}) and Number of Dedicated Tx Buffers (${reg.TXBC.fields.NDTB}) exceeds maximum (32)`
      });
    }
  } // TXBC

  // === TXFQS: Tx FIFO/Queue Status Register ============================
  if ('TXFQS' in reg && reg.TXFQS.int32 !== undefined) {
    const regValue = reg.TXFQS.int32;

    // 0. Extend existing register structure
    reg.TXFQS.fields = {};
    reg.TXFQS.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 38)
    reg.TXFQS.fields.TFQF  = getBits(regValue, 21, 21); // Tx FIFO/Queue Full (1 bit)
    reg.TXFQS.fields.TFQPI = getBits(regValue, 20, 16); // Tx FIFO/Queue Put Index (5 bits)
    reg.TXFQS.fields.TFGI  = getBits(regValue, 12,  8); // Tx FIFO/Queue Get Index (5 bits)
    reg.TXFQS.fields.TFFL  = getBits(regValue,  5,  0); // Tx FIFO/Queue Fill Level (6 bits)

    // 2. Generate human-readable register report (higher order bits first)
    reg.TXFQS.report.push({
      severityLevel: sevC.Info,
      msg: `TXFQS: ${reg.TXFQS.name_long} (0x${reg.TXFQS.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TFQF ] Tx FIFO/Queue Full        = ${reg.TXFQS.fields.TFQF}\n` +
           `[TFQPI] Tx FIFO/Queue Put Index   = ${reg.TXFQS.fields.TFQPI}\n` +
           `[TFGI ] Tx FIFO/Queue Get Index   = ${reg.TXFQS.fields.TFGI}\n` +
           `[TFFL ] Tx FIFO/Queue Fill Level  = ${reg.TXFQS.fields.TFFL}`
    });
  } // TXFQS

  // === TXESC: Tx Buffer Element Size Configuration Register ============
  if ('TXESC' in reg && reg.TXESC.int32 !== undefined) {
    const regValue = reg.TXESC.int32;

    // 0. Extend existing register structure
    reg.TXESC.fields = {};
    reg.TXESC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 39)
    reg.TXESC.fields.TBDS = getBits(regValue, 3, 0); // Tx Buffer Data Field Size (4 bits)

    // 2. Generate human-readable register report (higher order bits first)
    reg.TXESC.report.push({
      severityLevel: sevC.Info,
      msg: `TXESC: ${reg.TXESC.name_long} (0x${reg.TXESC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TBDS] Tx Buffer Data Field Size = ${decodeConfiguredDataFieldSizeInByte(reg.TXESC.fields.TBDS)} bytes`
    });
  } // TXESC

  // === TXBRP: Transmit Buffer Request Pending Register =================
  if ('TXBRP' in reg && reg.TXBRP.int32 !== undefined) {
    const regValue = reg.TXBRP.int32;

    // 0. Extend existing register structure
    reg.TXBRP.fields = {};
    reg.TXBRP.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBRP.report.push({
      severityLevel: sevC.Info,
      msg: `TXBRP: ${reg.TXBRP.name_long} (0x${reg.TXBRP.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }

  // === TXBAR: Transmit Buffer Add Request Register =====================
  if ('TXBAR' in reg && reg.TXBAR.int32 !== undefined) {
    const regValue = reg.TXBAR.int32;

    // 0. Extend existing register structure
    reg.TXBAR.fields = {};
    reg.TXBAR.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBAR.report.push({
      severityLevel: sevC.Info,
      msg: `TXBAR: ${reg.TXBAR.name_long} (0x${reg.TXBAR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }

  // === TXBCR: Transmit Buffer Cancellation Request Register ============
  if ('TXBCR' in reg && reg.TXBCR.int32 !== undefined) {
    const regValue = reg.TXBCR.int32;

    // 0. Extend existing register structure
    reg.TXBCR.fields = {};
    reg.TXBCR.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBCR.report.push({
      severityLevel: sevC.Info,
      msg: `TXBCR: ${reg.TXBCR.name_long} (0x${reg.TXBCR.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }

  // === TXBTO: Transmit Buffer Transmission Occurred Register ===========
  if ('TXBTO' in reg && reg.TXBTO.int32 !== undefined) {
    const regValue = reg.TXBTO.int32;

    // 0. Extend existing register structure
    reg.TXBTO.fields = {};
    reg.TXBTO.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBTO.report.push({
      severityLevel: sevC.Info,
      msg: `TXBTO: ${reg.TXBTO.name_long} (0x${reg.TXBTO.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }

  // === TXBCF: Transmit Buffer Cancellation Finished Register ===========
  if ('TXBCF' in reg && reg.TXBCF.int32 !== undefined) {
    const regValue = reg.TXBCF.int32;

    // 0. Extend existing register structure
    reg.TXBCF.fields = {};
    reg.TXBCF.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBCF.report.push({
      severityLevel: sevC.Info,
      msg: `TXBCF: ${reg.TXBCF.name_long} (0x${reg.TXBCF.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }

  // === TXBTIE: Transmit Buffer Transmission Interrupt Enable Register ===
  if ('TXBTIE' in reg && reg.TXBTIE.int32 !== undefined) {
    const regValue = reg.TXBTIE.int32;

    // 0. Extend existing register structure
    reg.TXBTIE.fields = {};
    reg.TXBTIE.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBTIE.report.push({
      severityLevel: sevC.Info,
      msg: `TXBTIE: ${reg.TXBTIE.name_long} (0x${reg.TXBTIE.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }

  // === TXBCIE: Transmit Buffer Cancellation Finished Interrupt Enable Register ===
  if ('TXBCIE' in reg && reg.TXBCIE.int32 !== undefined) {
    const regValue = reg.TXBCIE.int32;

    // 0. Extend existing register structure
    reg.TXBCIE.fields = {};
    reg.TXBCIE.report = [];

    // 1. No bit field decoding required, just show as binary (like NDAT1)

    // 2. Generate human-readable register report (higher order bits first)
    let headline = "Bit: 31                  23                  15                  7               0\n";
    let binaryLine = "     ";
    for (let i = 31; i >= 0; i--) {
      binaryLine += ((regValue >> i) & 1);
      if (i > 0) binaryLine += " ";
      if (i % 4 === 0 && i > 0) binaryLine += "  ";
    }
    reg.TXBCIE.report.push({
      severityLevel: sevC.Info,
      msg: `TXBCIE: ${reg.TXBCIE.name_long} (0x${reg.TXBCIE.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` + headline + binaryLine
    });
  }
  
  // === TXEFC: Tx Event FIFO Configuration Register =====================
  if ('TXEFC' in reg && reg.TXEFC.int32 !== undefined) {
    const regValue = reg.TXEFC.int32;

    // 0. Extend existing register structure
    reg.TXEFC.fields = {};
    reg.TXEFC.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 44)
    reg.TXEFC.fields.EFWM = getBits(regValue, 29, 24); // Event FIFO Watermark (6 bits)
    reg.TXEFC.fields.EFS  = getBits(regValue, 21, 16); // Event FIFO Size (6 bits)
    reg.TXEFC.fields.EFSA = getBits(regValue, 15,  2); // Event FIFO Start Address (14 bits)

    // 2. Generate human-readable register report (higher order bits first)
    reg.TXEFC.report.push({
      severityLevel: sevC.Info,
      msg: `TXEFC: ${reg.TXEFC.name_long} (0x${reg.TXEFC.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[EFWM] Event FIFO Watermark      = ${reg.TXEFC.fields.EFWM}\n` +
           `[EFS ] Event FIFO Size           = ${reg.TXEFC.fields.EFS}\n` +
           `[EFSA] Event FIFO Start Address  = 0x${(reg.TXEFC.fields.EFSA<<2).toString(16).toUpperCase().padStart(4, '0')} (16 bit byte address, 2LSB=00)`
    });
  }

  // === TXEFS: Tx Event FIFO Status Register ============================
  if ('TXEFS' in reg && reg.TXEFS.int32 !== undefined) {
    const regValue = reg.TXEFS.int32;
    reg.TXEFS.fields = {};
    reg.TXEFS.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 45)
    reg.TXEFS.fields.TEFL = getBits(regValue, 25, 25); // Tx Event FIFO Element Lost (1 bit)
    reg.TXEFS.fields.EFF  = getBits(regValue, 24, 24); // Event FIFO Full (1 bit)
    reg.TXEFS.fields.EFPI = getBits(regValue, 20, 16); // Event FIFO Put Index (5 bits)
    reg.TXEFS.fields.EFGI = getBits(regValue, 12, 8);  // Event FIFO Get Index (5 bits)
    reg.TXEFS.fields.EFFL = getBits(regValue,  5,  0); // Event FIFO Fill Level (6 bits)

    // 2. Generate human-readable register report (higher order bits first)
    reg.TXEFS.report.push({
      severityLevel: sevC.Info,
      msg: `TXEFS: ${reg.TXEFS.name_long} (0x${reg.TXEFS.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[TEFL] Tx Event FIFO Element Lost = ${reg.TXEFS.fields.TEFL}\n` +
           `[EFF ] Event FIFO Full            = ${reg.TXEFS.fields.EFF}\n` +
           `[EFPI] Event FIFO Put Index       = ${reg.TXEFS.fields.EFPI}\n` +
           `[EFGI] Event FIFO Get Index       = ${reg.TXEFS.fields.EFGI}\n` +
           `[EFFL] Event FIFO Fill Level      = ${reg.TXEFS.fields.EFFL}`
    });
  }

  // === TXEFA: Tx Event FIFO Acknowledge Register =======================
  if ('TXEFA' in reg && reg.TXEFA.int32 !== undefined) {
    const regValue = reg.TXEFA.int32;
    reg.TXEFA.fields = {};
    reg.TXEFA.report = [];

    // 1. Decode all individual bits/fields (M_CAN User Manual v3.3.1, page 45)
    reg.TXEFA.fields.EFAI = getBits(regValue, 4, 0); // Event FIFO Acknowledge Index (5 bits)

    // 2. Generate human-readable register report
    reg.TXEFA.report.push({
      severityLevel: sevC.Info,
      msg: `TXEFA: ${reg.TXEFA.name_long} (0x${reg.TXEFA.addr.toString(16).toUpperCase().padStart(3, '0')}: 0x${regValue.toString(16).toUpperCase().padStart(8, '0')})\n` +
           `[EFAI] Event FIFO Acknowledge Index = ${reg.TXEFA.fields.EFAI}`
    });
  }
}

// === Memory Map Check for M_CAN Message RAM Structures =========================
// This function creates a memory map of the enabled M_CAN data structures in Message RAM,
// sorts them by start address, and checks for overlaps/collisions.
function checkMcanMessageRamMap(reg) {
  // Helper to add a structure if enabled and address is present
  function addStruct(name, enabled, startAddr, size, elemNum, elemSize) {
    if (enabled) {
      memMapUsedArray.push({
        name,
        startAddr,
        endAddr: startAddr + size - 1,
        size,
        elemNum,
        elemSize
      });
    } else {
      memMapUnUsedArray.push({
        name,
        startAddr,
        endAddr: startAddr + size - 1,
        size,
        elemNum,
        elemSize
      });
    }
  }

  // Collect all structures
  const memMapUsedArray = []; // used structures (like FIFOs)
  const memMapUnUsedArray = []; // unused structures (like FIFOs)

  // --- Standard ID Filter List ---
  if (reg.SIDFC && reg.SIDFC.fields) {
    const enabled = (reg.SIDFC.fields.LSS > 0);
    const startAddr = reg.SIDFC.fields.FLSSA << 2;
    const elemNum = reg.SIDFC.fields.LSS;
    const elemSize = 4;
    const size = reg.SIDFC.fields.LSS * elemSize;
  addStruct("STD Filter", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- Extended ID Filter List ---
  if (reg.XIDFC && reg.XIDFC.fields) {
    const enabled = (reg.XIDFC.fields.LSE > 0);
    const startAddr = reg.XIDFC.fields.FLESA << 2;
    const elemNum = reg.XIDFC.fields.LSE;
    const elemSize = 8;
    const size = reg.XIDFC.fields.LSE * elemSize;
    addStruct("EXT Filter", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- RX FIFO 0 ---
  if (reg.RXF0C && reg.RXF0C.fields) {
    const enabled = (reg.RXF0C.fields.F0S > 0);
    const startAddr = reg.RXF0C.fields.F0SA << 2;
    const elemNum = reg.RXF0C.fields.F0S;
    let elemSize = 4; // default: 2 bytes (header+data)
    if (reg.RXESC && reg.RXESC.fields) {
      elemSize = 8 + decodeConfiguredDataFieldSizeInByte(reg.RXESC.fields.F0DS); // 8 bytes header + data
    }
    const size = reg.RXF0C.fields.F0S * elemSize;
    addStruct("RX FIFO 0", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- RX FIFO 1 ---
  if (reg.RXF1C && reg.RXF1C.fields) {
    const enabled = (reg.RXF1C.fields.F1S > 0);
    const startAddr = reg.RXF1C.fields.F1SA << 2;
    const elemNum = reg.RXF1C.fields.F1S;
    let elemSize = 4; // default: 2 bytes (header+data)
    if (reg.RXESC && reg.RXESC.fields) {
      elemSize = 8 + decodeConfiguredDataFieldSizeInByte(reg.RXESC.fields.F1DS);
    }
    const size = reg.RXF1C.fields.F1S * elemSize;
    addStruct("RX FIFO 1", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- RX dedicated Buffer ---
  if (reg.RXBC && reg.RXBC.fields) {
    const enabled = (reg.RXBC.fields.RBSA > 0); // HINT: Assume it to be enabled if Address != 0
    const startAddr = reg.RXBC.fields.RBSA << 2;
    // Number of RX buffers = sum of NDAT1/2 bits set, but spec: up to 64
    let elemNum = 0; // not configured in M_CAN; this is indirectly configured via the target in the RX filters
    let elemSize = 0; // default: 2 bytes (header+data)
    if (reg.RXESC && reg.RXESC.fields) {
      elemSize = 8 + decodeConfiguredDataFieldSizeInByte(reg.RXESC.fields.RBDS);
    }
    const size = elemNum * elemSize;
    addStruct("RX Buffer ded.", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- TX dedicated Buffer ---
  if (reg.TXBC && reg.TXBC.fields) {
    const enabled = (reg.TXBC.fields.NDTB > 0);
    const startAddr = reg.TXBC.fields.TBSA << 2;
    // Number of TX buffers = NDTB
    const elemNum = reg.TXBC.fields.NDTB;
    let elemSize = 0;
    if (reg.TXESC && reg.TXESC.fields) {
      elemSize = 8 + decodeConfiguredDataFieldSizeInByte(reg.TXESC.fields.TBDS);
    }
    const size = elemNum * elemSize;
    addStruct("TX Buffer ded.", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- TX FIFO/Queue ---
  if (reg.TXBC && reg.TXBC.fields) {
    const enabled = (reg.TXBC.fields.TFQS > 0);
    // Number of TX buffers = TFQS (dedicated + FIFO/Queue)
    const elemNum = reg.TXBC.fields.TFQS;
    let elemSize = 0;
    if (reg.TXESC && reg.TXESC.fields) {
      elemSize = 8 + decodeConfiguredDataFieldSizeInByte(reg.TXESC.fields.TBDS);
    }
    const startAddr = (reg.TXBC.fields.TBSA << 2) + (reg.TXBC.fields.NDTB * elemSize); // Start after dedicated buffers

    const size = elemNum * elemSize;
    addStruct("TX FIFO/Queue", enabled, startAddr, size, elemNum, elemSize);
  }

  // --- TX Event FIFO ---
  if (reg.TXEFC && reg.TXEFC.fields) {
    const enabled = (reg.TXEFC.fields.EFS > 0);
    const startAddr = reg.TXEFC.fields.EFSA << 2;
    const elemNum = reg.TXEFC.fields.EFS;
    const elemSize = 8; // Each event is 8 bytes
    const size = elemNum * elemSize;
    addStruct("TX Event FIFO", enabled, startAddr, size, elemNum, elemSize);
  }

  // Sort by start address
  memMapUsedArray.sort((a, b) => a.startAddr - b.startAddr);

  // generate reports
  reg.memmap = {};
  reg.memmap.report = []; // Initialize report array

  // Build & submit memory map report
  let mapReport = "Message RAM Memory Map:";
  for (const s of memMapUsedArray) {
    mapReport += `\n${(s.name).padEnd(14)}: 0x${s.startAddr.toString(16).toUpperCase().padStart(6, "0")} - 0x${s.endAddr.toString(16).toUpperCase().padStart(6, "0")}` +
                 ` (${s.size.toString().padStart(4, " ")} byte)` +
                 ` elemNum=${s.elemNum.toString().padStart(2, " ")},` +
                 ` elemSize=${s.elemSize.toString().padStart(2, " ")} byte`;
  }
  reg.memmap.report.push({
      severityLevel: sevC.InfoCalc,
      msg: mapReport
  });

  // Build & submit report about unused/disabled structures
  let unusedReport = "Message RAM: Unused/Disabled structures";
  for (const s of memMapUnUsedArray) {
    unusedReport += `\n${s.name.padEnd(14)}: 0x${s.startAddr.toString(16).toUpperCase().padStart(6, "0")} - undefin.` +
                    ` (${s.size.toString().padStart(4, " ")} byte)` +
                    ` elemNum=${s.elemNum.toString().padStart(2, " ")}, ` +
                    ` elemSize=${s.elemSize.toString().padStart(2, " ")} byte`;
  }
  reg.memmap.report.push({
      severityLevel: sevC.Info,
      msg: unusedReport
  });

  // Check for collisions
  let collisionReport = "";
  for (let i = 0; i < memMapUsedArray.length - 1; i++) {
    const a = memMapUsedArray[i];
    const b = memMapUsedArray[i + 1];
    if (a.endAddr >= b.startAddr) {
      collisionReport += `Collision: ${a.name} [0x${a.startAddr.toString(16).toUpperCase().padStart(6, "0")}-0x${a.endAddr.toString(16).toUpperCase().padStart(6, "0")}] overlaps with ` +
                                    `${b.name} [0x${b.startAddr.toString(16).toUpperCase().padStart(6, "0")}-0x${b.endAddr.toString(16).toUpperCase().padStart(6, "0")}]\n`;
    }
  }
  
  // Build & submit collision report, if existing
  if (collisionReport) {
    reg.memmap.report.push({
      severityLevel: sevC.Error,
      msg: 'Message RAM Memory Map: Collisions detected\n' + collisionReport
    });
  } else {
    reg.memmap.report.push({
      severityLevel: sevC.InfoCalc,
      msg: 'Message RAM Memory Map: no collisions detected'
    });
  }
}