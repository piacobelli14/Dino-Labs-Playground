//
//  Settings.swift
//
//  Created by Peter Iacobelli on 4/4/25.
//

import SwiftUI
import AppKit

struct Settings: View {
    @Binding var currentView: AppView
    @Binding var authenticatedUsername: String
    @Binding var authenticatedOrgID: String
    @StateObject private var networkMonitor = NetworkMonitor()
    
    let gradient = LinearGradient(
        gradient: Gradient(colors: [Color(hex: 0x222832), Color(hex: 0x33435F)]),
        startPoint: .leading,
        endPoint: .trailing
    )
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                ScrollView {
                    VStack(spacing: 0) {
                        
                        HStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 0) {
                                HStack {
                                    Image(systemName: "wifi")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 2)
                                    
                                    Text("Network")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.9))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 12)
                                .padding(.leading, 2)
                                
                                Text("\(networkMonitor.networkName)")
                                    .font(.system(size: 28, weight: .semibold))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                    .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                    .allowsHitTesting(false)
                                    .padding(.bottom, 16)
                                
                                HStack(spacing: 0) {
                                    Text("IP Address: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.ipAddress)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Interface: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.interfaceName)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("RSSI: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.wifiRSSI)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x191919),
                            borderColor: Color.clear, borderWidth: 0,
                            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0
                        )
                        .overlay(
                            Rectangle()
                                .frame(height: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .bottom
                        )
                        .hoverEffect(opacity: 0.5, cursor: .pointingHand)
                        .clickEffect(opacity: 1.0)
                        
                        
                        HStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 0) {
                                HStack {
                                    Image(systemName: "minus.plus.batteryblock")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 2)
                                    
                                    Text("Battery")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.9))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 12)
                                .padding(.leading, 2)
                                
                                Text("\(networkMonitor.batteryLevel)  \(networkMonitor.batteryState)")
                                    .font(.system(size: 28, weight: .semibold))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                    .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                    .allowsHitTesting(false)
                                    .padding(.bottom, 16)
                                
                                UsageBar(usage: parseBatteryString(networkMonitor.batteryLevel))
                                    .frame(width: 150, height: 10)
                                    .padding(.bottom, 16)
                                
                                HStack(spacing: 0) {
                                    Text("\(networkMonitor.batteryTimeRemaining)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Temperature: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text(" \(networkMonitor.batteryTemperature)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Cycle Count: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.batteryCycleCount)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .leading, spacing: 0) {
                                HStack(spacing: 0) {
                                    Text("Design Capacity: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.batteryDesignCapacity)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Current Capacity: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.batteryCurrentCapacity)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Voltage: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.batteryVoltage)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Amperage: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.batteryAmperage)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 10)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x191919),
                            borderColor: Color.clear, borderWidth: 0,
                            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0
                        )
                        .overlay(
                            Rectangle()
                                .frame(height: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .bottom
                        )
                        .hoverEffect(opacity: 0.5, cursor: .pointingHand)
                        .clickEffect(opacity: 1.0)
                        
                        HStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 0) {
                                HStack {
                                    Image(systemName: "laptopcomputer")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(Color(hex: 0xf5f5f5).opacity(0.6))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 2)
                                    
                                    Text("Computer")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.9))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                }
                                .padding(.bottom, 12)
                                .padding(.leading, 2)
                                
                                HStack(spacing: 0) {
                                    Text("CPU Usage: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.cpuUsage)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                    
                                    UsageBar(usage: parseCPUString(networkMonitor.cpuUsage))
                                        .frame(width: 80, height: 8)
                                        .padding(.leading, 8)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Used Disk Space: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.usedDiskSpace)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                    
                                    UsageBar(
                                        usage: diskUsageRatio(
                                            total: networkMonitor.totalDiskSpace,
                                            available: networkMonitor.freeDiskSpace
                                        ),
                                        barColor: Color.red
                                    )
                                    .frame(width: 80, height: 8)
                                    .padding(.leading, 8)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Free Disk Space: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.freeDiskSpace)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                    
                                    UsageBar(
                                        usage: 1 - diskUsageRatio(
                                            total: networkMonitor.totalDiskSpace,
                                            available: networkMonitor.freeDiskSpace
                                        ),
                                        barColor: Color.green
                                    )
                                    .frame(width: 80, height: 8)
                                    .padding(.leading, 8)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Used Memory: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.usedMemory)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                    
                                    UsageBar(
                                        usage: memoryUsageRatio(
                                            used: networkMonitor.usedMemory,
                                            free: networkMonitor.freeMemory
                                        ),
                                        barColor: Color.red
                                    )
                                    .frame(width: 80, height: 8)
                                    .padding(.leading, 8)
                                }
                                .padding(.bottom, 10)
                                
                                HStack(spacing: 0) {
                                    Text("Free Memory: ")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.8))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                        .padding(.trailing, 4)
                                    
                                    Text("\(networkMonitor.freeMemory)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Color(hex: 0xc1c1c1))
                                        .shadow(color: Color.gray.opacity(0.5), radius: 0.5, x: 0, y: 0)
                                        .allowsHitTesting(false)
                                    
                                    UsageBar(
                                        usage: 1 - memoryUsageRatio(
                                            used: networkMonitor.usedMemory,
                                            free: networkMonitor.freeMemory
                                        ),
                                        barColor: Color.green
                                    )
                                    .frame(width: 80, height: 8)
                                    .padding(.leading, 8)
                                }
                                .padding(.bottom, 10)
                                
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .containerHelper(
                            backgroundColor: Color(hex: 0x191919),
                            borderColor: Color.clear, borderWidth: 0,
                            topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0
                        )
                        .overlay(
                            Rectangle()
                                .frame(height: 0.5)
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.4)),
                            alignment: .bottom
                        )
                        .hoverEffect(opacity: 0.5, cursor: .pointingHand)
                        .clickEffect(opacity: 1.0)
                        
                        
                        Spacer()
                    }
                    .frame(width: geometry.size.width, height: geometry.size.height - 50)
                    .padding(.top, 50)
                    .background(Color(hex: 0x111111))
                }
                
                NavigationBar(geometry: geometry, currentView: $currentView)
                    .frame(width: geometry.size.width)
                
            }
        }
    }
}

struct UsageBar: View {
    let usage: Double
    var barColor: Color = .green
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .cornerRadius(3)
                Rectangle()
                    .fill(barColor)
                    .frame(width: geometry.size.width * CGFloat(usage))
                    .cornerRadius(3)
            }
        }
    }
}

private func parseCPUString(_ cpuString: String) -> Double {
    let sanitized = cpuString.replacingOccurrences(of: "%", with: "")
    let usageDouble = Double(sanitized.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
    return min(max(usageDouble / 100.0, 0), 1)
}

private func parseBatteryString(_ batteryString: String) -> Double {
    let sanitized = batteryString.replacingOccurrences(of: "%", with: "")
    let usageDouble = Double(sanitized.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
    return min(max(usageDouble / 100.0, 0), 1)
}

private func memoryUsageRatio(used: String, free: String) -> Double {
    let usedVal = parseMemoryString(used)
    let freeVal = parseMemoryString(free)
    let totalVal = usedVal + freeVal
    if totalVal <= 0 { return 0 }
    return usedVal / totalVal
}

private func parseMemoryString(_ memoryString: String) -> Double {
    let components = memoryString.split(separator: " ")
    guard components.count == 2,
          let value = Double(components[0]),
          let unit = components.last else { return 0 }
    
    switch unit {
    case "MB":
        return value
    case "GB":
        return value * 1024
    case "TB":
        return value * 1024 * 1024
    default:
        return 0
    }
}

private func diskUsageRatio(total: String, available: String) -> Double {
    let totalVal = parseStorageString(total)
    let availableVal = parseStorageString(available)
    let usedVal = totalVal - availableVal
    if totalVal <= 0 { return 0 }
    return usedVal / totalVal
}

private func parseStorageString(_ storageString: String) -> Double {
    let components = storageString.split(separator: " ")
    guard components.count == 2,
          let value = Double(components[0]),
          let unit = components.last else { return 0 }
    
    switch unit {
    case "MB":
        return value
    case "GB":
        return value * 1024
    case "TB":
        return value * 1024 * 1024
    default:
        return 0
    }
}
