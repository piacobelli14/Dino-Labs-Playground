//
//  DinoLabsDinoDigitsCalc.swift
//
//  Created by Peter Iacobelli on 4/1/25.
//

import SwiftUI
import AppKit

struct DinoLabsDinoDigitsCalc: View {
    let geometry: GeometryProxy
    @Binding var leftPanelWidthRatio: CGFloat
    
    var body: some View {
        VStack(spacing: 0) {
            
        }
        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio),
               height: (geometry.size.height - 50) * 0.9)
        
    }
}
