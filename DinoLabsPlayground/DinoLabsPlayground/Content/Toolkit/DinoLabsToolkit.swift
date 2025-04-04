import SwiftUI
import AppKit

struct ToolCell: Identifiable {
    let id = UUID()
    let toolOpenName: String
    let title: String
    let description: String
    let imageName: String
    let gradientColors: [Color]
}

struct DinoLabsToolkit: View {
    let geometry: GeometryProxy
    @Binding var authenticatedUsername: String
    @Binding var authenticatedOrgID: String
    @Binding var isToolkit: Bool
    @Binding var leftPanelWidthRatio: CGFloat
    @State private var isToolOpen: Bool = false
    @State private var toolOpenName: String = ""
    @State private var searchText: String = ""
    
    private let cells: [ToolCell] = [
        ToolCell(toolOpenName: "DinoDigitsCalc", title: "Dino Digits - Calc", description: "", imageName: "plus.forwardslash.minus", gradientColors: [Color(hex: 0x008167), Color(hex: 0x4BBDB4)]),
        ToolCell(toolOpenName: "DinoDigitsPlot", title: "Dino Digits - Plot", description: "", imageName: "chart.dots.scatter", gradientColors: [Color(hex: 0x008143), Color(hex: 0x4BBD90)])
    ]
    
    private var filteredCells: [ToolCell] {
        if searchText.isEmpty {
            return cells
        } else {
            return cells.filter { $0.title.lowercased().contains(searchText.lowercased()) }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            if !isToolOpen {
                HStack {
                    Spacer()
                    ToolkitTextField(placeholder: "Search available tools...", text: $searchText)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .textFieldStyle(PlainTextFieldStyle())
                        .foregroundColor(.white)
                        .font(.system(size: 11, weight: .heavy))
                        .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.90, height: 40)
                        .padding(.horizontal, 20)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x171717),
                            borderColor: Color(hex: 0x616161),
                            borderWidth: 2,
                            topLeft: 6,
                            topRight: 6,
                            bottomLeft: 6,
                            bottomRight: 6,
                            shadowColor: .clear,
                            shadowRadius: 0,
                            shadowX: 0,
                            shadowY: 0
                        )
                        .hoverEffect(opacity: 0.8)
                    Spacer()
                }
                .padding(.vertical, 15)
                
                ScrollView {
                    LazyVGrid(
                        columns: [
                            GridItem(.flexible(), spacing: 20),
                            GridItem(.flexible(), spacing: 20)
                        ],
                        spacing: 20
                    ) {
                        ForEach(filteredCells) { cell in
                            Button(action: {
                                isToolOpen = true
                                toolOpenName = cell.toolOpenName
                            }) {
                                VStack {
                                    HStack {
                                        Image(systemName: cell.imageName)
                                            .resizable()
                                            .aspectRatio(contentMode: .fit)
                                            .frame(width: 14, height: 14)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.white)
                                            .allowsHitTesting(false)
                                            .padding(.trailing, 4)
                                        Text(cell.title)
                                            .font(.system(size: 14, weight: .heavy))
                                            .foregroundColor(.white)
                                        Spacer()
                                    }
                                    .padding(.leading, 4)
                                }
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: cell.gradientColors),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .cornerRadius(8)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .hoverEffect(opacity: 0.5, scale: 1.02, cursor: .pointingHand)
                        }
                    }
                    .padding([.leading, .trailing, .bottom])
                }
            } else {
                if toolOpenName == "DinoDigitsPlot" {
                    DinoLabsDinoDigitsPlot(geometry: geometry, leftPanelWidthRatio: $leftPanelWidthRatio)
                } else if toolOpenName == "DinoDigitsCalc" {
                    DinoLabsDinoDigitsCalc(geometry: geometry, leftPanelWidthRatio: $leftPanelWidthRatio)
                }
            }
        }
        .frame(
            width: geometry.size.width * (1 - leftPanelWidthRatio),
            height: (geometry.size.height - 50) * 0.9
        )
        .containerHelper(
            backgroundColor: Color(hex: 0x242424),
            borderColor: .clear,
            borderWidth: 0,
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
            shadowColor: .clear,
            shadowRadius: 0,
            shadowX: 0,
            shadowY: 0
        )
    }
}
