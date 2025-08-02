/**
 * Zeichnet das CAN Bit Timing als Balkendiagramm mit SVG.
 * @param {string} HTMLDrawingName - Name des SVG-Elements, in dem gezeichnet werden soll.
 *   Beispiel: 'DrawingBTNominal' für das nominale Bit Timing.
 * @param {string} BitTimingName - Name des Bit Timings, der im Balkenbereich angezeigt wird.
 *   Beispiel: 'Nominal Bit Timing' für das nominale Bit Timing.
 * @param {number} spPercent - Prozentualer Wert des Sample-Punkts (0-100).
 *   Beispiel: 80 für 80% des Bit Timing. 
 * @param {number} PropSeg, PhaseSeg1, PhaseSeg2, sjwLen - Bit timing parameter in TQ.
 * @param {number} sspPercent - Prozentualer Wert des SSP (0-100).
 *   Beispiel: 60 für 60% des Bit Timing.
 * @param {number} tdcEna - TDC enabled (true) or disabled (false).
 */
// ===================================================================================
export function drawBitTiming(PropSeg, PhaseSeg1, PhaseSeg2, spPercent, sjwLen, sspPercent, tdcEna, HTMLDrawingName, BitTimingName) { // TODO: receive width as parameter
  // svg widht/height
  const svgHeight = 60; // Height of the SVG element in Pixel
  const svgWidth = document.getElementById('BitTimingTable').offsetWidth; // Width of the SVG element

  // dimension svg element
  let svg = document.getElementById(HTMLDrawingName);
  svg.setAttribute('width', svgWidth);
  svg.setAttribute('height', svgHeight);

  // Erase previous content (drawing + text)
  svg.innerHTML = '';

  // define colors
  const sjwColor = '#999999'; // Farbe der SJW Linie
  const spColor = 'red'; // Farbe der Sample Point Linie
  const sspColor = '#800080'; // Farbe der SSP Linie (TDC)
  const textColor = 'black'; // Farbe der Beschriftung
  const syncSegColor = '#555555'; // Farbe des SyncSeg Balkens
  const PropSegColor = '#4CAF50'; // Farbe des PropSeg Balkens
  const PhaseSeg1Color = '#2196F3'; // Farbe des PhaseSeg1 Balkens
  const PhaseSeg2Color = '#FF9800'; // Farbe des PhaseSeg2 Balkens

  // Positions in SVG
  const fontSize = 14; // Schriftgröße
  const yTextSP = 0; // Text position SP
  const yTextName = 0; // Y-Position des Textes
  const xTextName = 0; // X-Position des Textes

  const ySPueberstand = 5; // Sample Point Line übersteht den Balken um 5px nach oben und unten
  const yBarTop = fontSize + ySPueberstand + 2; // Y-Position of bar
  const yBarHeigth = svg.clientHeight - yBarTop - ySPueberstand;

  const spLineWidht = 5; // Dicke der SP Linie
  const sspLineWidht = 2; // Dicke der SSP Linie
  const sjwLineWidth = 8; // Dicke der SJW Linie

  // Berechnungen für die Balken
  const totalTQ = 1 + PropSeg + PhaseSeg1 + PhaseSeg2;; // Gesamtlänge in TQ
  let x = 0; // current x-Position in SVG

  // Sample Point
  let sampleX = null;
  let segWidthPixel = 0; // width of the current segment in pixels
  let rect = null; // SVG rectangle element for segments

  // DEBUG: draw a rectangle around the SVG area
  //const debugRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  //debugRect.setAttribute('x', 0);
  //debugRect.setAttribute('y', 0);
  //debugRect.setAttribute('width', svgWidth);
  //debugRect.setAttribute('height', svgHeight);
  //debugRect.setAttribute('fill', 'none');
  //debugRect.setAttribute('stroke', 'red');
  //debugRect.setAttribute('stroke-width', 1);
  //svg.appendChild(debugRect);

  // SyncSeg drawing ----------------------------------
  segWidthPixel = (1 / totalTQ) * svgWidth;
  rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', yBarTop); // 25px Abstand von oben
  rect.setAttribute('width', segWidthPixel);
  rect.setAttribute('height', yBarHeigth);
  rect.setAttribute('fill', syncSegColor);
  svg.appendChild(rect);
  x += segWidthPixel; // x-Position for next Segment

  // PropSeg drawing ----------------------------------
  segWidthPixel = (PropSeg / totalTQ) * svgWidth;
  rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', yBarTop); // 25px Abstand von oben
  rect.setAttribute('width', segWidthPixel);
  rect.setAttribute('height', yBarHeigth);
  rect.setAttribute('fill', PropSegColor);
  svg.appendChild(rect);
  x += segWidthPixel; // x-Position for next Segment

  // PhaseSeg1 drawing ----------------------------------
  segWidthPixel = (PhaseSeg1 / totalTQ) * svgWidth;
  rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', yBarTop); // 25px Abstand von oben
  rect.setAttribute('width', segWidthPixel);
  rect.setAttribute('height', yBarHeigth);
  rect.setAttribute('fill', PhaseSeg1Color);
  svg.appendChild(rect);
  x += segWidthPixel; // x-Position for next Segment

  // SP Position: X-Postion merken
  sampleX = x; // Position am Ende des PhaseSeg1, hier wird der Sample Point gezeichnet
  
  // PhaseSeg1 drawing ----------------------------------
  segWidthPixel = (PhaseSeg2 / totalTQ) * svgWidth;
  rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', yBarTop); // 25px Abstand von oben
  rect.setAttribute('width', segWidthPixel);
  rect.setAttribute('height', yBarHeigth);
  rect.setAttribute('fill', PhaseSeg2Color);
  svg.appendChild(rect);

  // SJW drawing ----------------------------------------
  const sjwPixel = (sjwLen / totalTQ) * svgWidth;
  const sjwLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  sjwLine.setAttribute('x1', sampleX - sjwPixel);
  sjwLine.setAttribute('x2', sampleX + sjwPixel);
  sjwLine.setAttribute('y1', yBarTop + yBarHeigth - sjwLineWidth/2);
  sjwLine.setAttribute('y2', yBarTop + yBarHeigth - sjwLineWidth/2);
  sjwLine.setAttribute('stroke', sjwColor);
  sjwLine.setAttribute('stroke-width', sjwLineWidth);
  sjwLine.setAttribute('marker-start', 'url(#arrow)');
  sjwLine.setAttribute('marker-end', 'url(#arrow)');
  svg.appendChild(sjwLine);

  // SP drawing ----------------------------------------
  if (sampleX !== null && typeof spPercent === 'number') {
    // Sample Point Line
    const spLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    spLine.setAttribute('x1', sampleX);
    spLine.setAttribute('x2', sampleX);
    spLine.setAttribute('y1', yBarTop - ySPueberstand);
    spLine.setAttribute('y2', yBarTop + yBarHeigth + ySPueberstand);
    spLine.setAttribute('stroke', spColor);
    spLine.setAttribute('stroke-width', spLineWidht);
    svg.appendChild(spLine);
    // Sample Point Label
    const spLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    spLabel.setAttribute('x', sampleX);
    spLabel.setAttribute('y', yTextSP);
    spLabel.setAttribute('fill', spColor);
    spLabel.setAttribute('font-size', fontSize);
    spLabel.setAttribute('font-family', 'sans-serif');
    spLabel.setAttribute('text-anchor', 'middle');
    spLabel.setAttribute('dominant-baseline', 'text-before-edge'); // Vertical alignment: auto, middle, central, hanging, text-before-edge, text-after-edge, alphabetic (default), ideographic
    spLabel.textContent = `SP ${Math.round(spPercent)}%`;
    svg.appendChild(spLabel);
  } else {
    console.log(`[Error] drawBitTiming(${BitTimingName}): sampleX or spPercent is not defined!`);
  }

  // SSP drawing -----------------------------------------
  if (tdcEna === true && typeof sspPercent === 'number') {
    const xSSPposition = sspPercent/100 * svgWidth; // X-Position of SSP Line
    // SSP Line
    const spLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    spLine.setAttribute('x1', xSSPposition);
    spLine.setAttribute('x2', xSSPposition);
    spLine.setAttribute('y1', yBarTop - ySPueberstand);
    spLine.setAttribute('y2', yBarTop + yBarHeigth + ySPueberstand);
    spLine.setAttribute('stroke', sspColor);
    spLine.setAttribute('stroke-width', sspLineWidht);
    svg.appendChild(spLine);
    //// SSP Label
    //const spLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    //spLabel.setAttribute('x', sampleX);
    //spLabel.setAttribute('y', yTextSP);
    //spLabel.setAttribute('fill', sspColor);
    //spLabel.setAttribute('font-size', fontSize);
    //spLabel.setAttribute('font-family', 'sans-serif');
    //spLabel.setAttribute('text-anchor', 'middle');
    //spLabel.setAttribute('dominant-baseline', 'text-before-edge'); // Vertical alignment: auto, middle, central, hanging, text-before-edge, text-after-edge, alphabetic (default), ideographic
    //spLabel.textContent = `SP ${Math.round(sspPercent)}%`;
    //svg.appendChild(spLabel);
  } else {
    // since SSP is optional, we can skip this part
    // Debug: console.log(`[Error] drawBitTiming(${BitTimingName}): tdcEna or sspPercent is not defined!`);
  }

  // Gesamtbeschriftung im Balkenbereich (links)
  const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  titleText.setAttribute('x', xTextName);       // Abstand vom linken Rand
  titleText.setAttribute('y', yTextName);  
  titleText.setAttribute('fill', textColor);
  titleText.setAttribute('font-size', fontSize);
  titleText.setAttribute('font-family', 'sans-serif');
  titleText.setAttribute('dominant-baseline', 'text-before-edge'); // Vertical alignment: auto, middle, central, hanging, text-before-edge, text-after-edge, alphabetic (default), ideographic
  titleText.textContent = BitTimingName;
  svg.appendChild(titleText);
}

// ===================================================================================
// Draw PWM symbols of 1 XL Data Phase Bit
export function drawPWMsymbols(PWMS, PWML, pwm_symbols_per_bit, HTMLDrawingName, NameToPrint) {
  // svg widht/height
  const svgHeight = 60; // Height of the SVG element in Pixel
  const svgWidth = document.getElementById('BitTimingTable').offsetWidth; // Width of the SVG element

  // dimension svg element
  let svg = document.getElementById(HTMLDrawingName);
  svg.setAttribute('width', svgWidth);
  svg.setAttribute('height', svgHeight);

  // Erase previous content (drawing + text)
  svg.innerHTML = '';

  // Positions in SVG
  const fontSize = 14; // Schriftgröße
  const yTextName = 0; // Y-Position des Textes
  const xTextName = 0; // X-Position des Textes

  const lineWidth = 6; // Dicke der SJW Linie
  const lineColor = 'black'; // Color of the Line
  const noPWMboxColor = '#DDDDDD'; // Color of the box, if no PWM symbols are possible

  const yMarginText2PWM = 7; // Sample Point Line übersteht den Balken um 5px nach oben und unten
  const yMarginPWM2Bottom = lineWidth/2 + 1; // Margin from PWM symbols to bottom of SVG: as much, that the line is fully visible
  const y_pwm_top = fontSize + yMarginText2PWM + lineWidth/2; // y-Position of PWM symbol
  const y_pwm_bottom = svg.clientHeight - yMarginPWM2Bottom; // y-Position des Balkens unten

  // Calculate pixels for PWMs and PWML
  const totalMTQ = (PWMS + PWML) * pwm_symbols_per_bit; // Total lenght in mTQ (minimum TQ = CAN CLOCK Periods)
  
  // Drawing the PWM symbols
  let x = lineWidth/2; // current position in SVG, start with half line width to center the first symbol

  // DEBUG: draw a rectangle around the SVG area
  //const debugRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  //debugRect.setAttribute('x', 0);
  //debugRect.setAttribute('y', 0);
  //debugRect.setAttribute('width', svgWidth);
  //debugRect.setAttribute('height', svgHeight);
  //debugRect.setAttribute('fill', 'none');
  //debugRect.setAttribute('stroke', 'red');
  //debugRect.setAttribute('stroke-width', 1);
  //svg.appendChild(debugRect);

  if (pwm_symbols_per_bit > 0) {
    // Draw PWM symbols
    for (let i = 0; i < pwm_symbols_per_bit; i++) {
      // Berechne Breite des aktuellen PWM-Symbols
      const PWMSwidthPX = (svgWidth / totalMTQ) * PWMS; // Width of PWMS in Pixel
      const PWMLwidthPX = (svgWidth / totalMTQ) * PWML; // Width of PWML in Pixel
    
      // PWMS: Vertical rising edge of PWM Symbol
      let myline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      myline.setAttribute('x1', x);
      myline.setAttribute('x2', x);
      myline.setAttribute('y1', y_pwm_bottom);
      myline.setAttribute('y2', y_pwm_top);
      myline.setAttribute('stroke', lineColor);
      myline.setAttribute('stroke-width', lineWidth);
      myline.setAttribute('stroke-linecap', 'square'); // or round, square or butt
      svg.appendChild(myline);
    
      // PWMS: Horizontal line
      myline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      myline.setAttribute('x1', x);
      myline.setAttribute('x2', x + PWMSwidthPX);
      myline.setAttribute('y1', y_pwm_top);
      myline.setAttribute('y2', y_pwm_top);
      myline.setAttribute('stroke', lineColor);
      myline.setAttribute('stroke-width', lineWidth);
      myline.setAttribute('stroke-linecap', 'square'); // or round, square or butt
      svg.appendChild(myline);
    
      x += PWMSwidthPX; // update X position for next line
    
      // PWML: Vertical rising edge of PWM Symbol
      myline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      myline.setAttribute('x1', x);
      myline.setAttribute('x2', x);
      myline.setAttribute('y1', y_pwm_top);
      myline.setAttribute('y2', y_pwm_bottom);
      myline.setAttribute('stroke', lineColor);
      myline.setAttribute('stroke-width', lineWidth);
      myline.setAttribute('stroke-linecap', 'square'); // or round, square or butt
      svg.appendChild(myline);
    
      // PWML: Horizontal line
      myline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      myline.setAttribute('x1', x);
      myline.setAttribute('x2', x + PWMLwidthPX);
      myline.setAttribute('y1', y_pwm_bottom);
      myline.setAttribute('y2', y_pwm_bottom);
      myline.setAttribute('stroke', lineColor);
      myline.setAttribute('stroke-width', lineWidth);
      myline.setAttribute('stroke-linecap', 'square'); // or round, square or butt
      svg.appendChild(myline);
    
      x += PWMLwidthPX; // update X position for next line
    }
  } else {
    // No PWM symbols possible, draw a box
    // Draw a box to indicate no PWM symbols
    let myrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');  
    myrect.setAttribute('x', 0);
    myrect.setAttribute('y', y_pwm_top - lineWidth/2); // y-Position of the top edge of the rectangle
    myrect.setAttribute('width', svgWidth); // fill the rest of the SVG
    myrect.setAttribute('height', y_pwm_bottom - y_pwm_top + lineWidth/2); // height of the rectangle
    myrect.setAttribute('fill', noPWMboxColor);
    svg.appendChild(myrect);
  }

  // Label
  const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  titleText.setAttribute('x', xTextName); // Distance from left edge
  titleText.setAttribute('y', yTextName); // Distance from top edge
  titleText.setAttribute('fill', 'black');
  titleText.setAttribute('font-size', fontSize);
  titleText.setAttribute('font-family', 'sans-serif');
  titleText.setAttribute('dominant-baseline', 'text-before-edge'); // Vertical alignment: auto, middle, central, hanging, text-before-edge, text-after-edge, alphabetic (default), ideographic
  titleText.textContent = NameToPrint;
  svg.appendChild(titleText);
}

// ===================================================================================
// Draw Error Message in a grey box
export function drawErrorMessage(HTMLDrawingName, NameToPrint, ErrorMsgToPrint) {
  // svg widht/height
  const svgHeight = 60; // Height of the SVG element in Pixel
  const svgWidth = document.getElementById('BitTimingTable').offsetWidth; // Width of the SVG element

  // dimension svg element
  let svg = document.getElementById(HTMLDrawingName);
  svg.setAttribute('width', svgWidth);
  svg.setAttribute('height', svgHeight);

  // Erase previous content (drawing + text)
  svg.innerHTML = '';

  // Positions in SVG
  const fontSize = 14; // Schriftgröße
  const yTextName = 0; // Y-Position des Textes
  const xTextName = 0; // X-Position des Textes

  const lineWidth = 6; // Line width for consistency
  const errorBoxColor = '#DDDDDD'; // Color of the error box (same grey as noPWMboxColor)

  const yMarginText2Box = 7; // Margin from text to box
  const yMarginBox2Bottom = 1; // Margin from box to bottom of SVG
  const yBoxTop = fontSize + yMarginText2Box; // y-Position of box top
  const yBoxBottom = svgHeight - yMarginBox2Bottom; // y-Position of box bottom

  // Draw the grey error box
  let errorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');  
  errorRect.setAttribute('x', 0);
  errorRect.setAttribute('y', yBoxTop); // y-Position of the top edge of the rectangle
  errorRect.setAttribute('width', svgWidth); // fill the entire width of the SVG
  errorRect.setAttribute('height', yBoxBottom - yBoxTop); // height of the rectangle
  errorRect.setAttribute('fill', errorBoxColor);
  svg.appendChild(errorRect);

  // Title Label (NameToPrint)
  const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  titleText.setAttribute('x', xTextName); // Distance from left edge
  titleText.setAttribute('y', yTextName); // Distance from top edge
  titleText.setAttribute('fill', 'black');
  titleText.setAttribute('font-size', fontSize);
  titleText.setAttribute('font-family', 'sans-serif');
  titleText.setAttribute('dominant-baseline', 'text-before-edge'); // Vertical alignment
  titleText.textContent = NameToPrint;
  svg.appendChild(titleText);

  // Error Message Label (ErrorMsgToPrint) - left aligned inside the grey box, vertically centered
  const errorText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  errorText.setAttribute('x', 10); // Small margin from left edge of box
  errorText.setAttribute('y', yBoxTop + (yBoxBottom - yBoxTop) / 2); // Vertically centered in the box
  errorText.setAttribute('fill', 'black');
  errorText.setAttribute('font-size', fontSize);
  errorText.setAttribute('font-family', 'sans-serif');
  errorText.setAttribute('dominant-baseline', 'central'); // Vertical alignment: perfectly center the text on the y position
  errorText.textContent = ErrorMsgToPrint;
  svg.appendChild(errorText);
}