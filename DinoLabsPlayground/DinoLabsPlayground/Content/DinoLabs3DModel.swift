//
//  DinoLabs3DModel.swift
//
//  Created by Peter Iacobelli on 3/25/25.
//

import SwiftUI
import AppKit

struct ThreeDModelView: View {
    let geometry: GeometryProxy
    let fileURL: URL
    @Binding var leftPanelWidthRatio: CGFloat
    @Binding var hasUnsavedChanges: Bool
    @Binding var showAlert: Bool
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    
                }
                .padding(.horizontal, 10)
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio), height: 80)
                .containerHelper(
                    backgroundColor: Color(hex: 0x171717),
                    borderColor: Color.clear,
                    borderWidth: 0, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0,
                    shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0
                )
            }
        }
    }
}
 
