//
//  NetworkMonitor.swift
//
//  Created by Peter Iacobelli on 2/12/25.
//

import SwiftUI
import Network
import CoreWLAN
import Darwin
import IOKit.ps
import IOKit

private let HOST_VM_INFO64_COUNT = MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size
private let HOST_CPU_LOAD_INFO_COUNT = UInt32(MemoryLayout<host_cpu_load_info_data_t>.size / MemoryLayout<integer_t>.size)

class NetworkMonitor: ObservableObject {
    private var monitor: NWPathMonitor
    private var queue: DispatchQueue
    @Published var isConnected: Bool = false
    @Published var signalStrength: String = "No Connection"
    @Published var downloadSpeed: String = "Calculating..."
    @Published var networkName: String = "Unknown"
    @Published var ipAddress: String = "Unknown"
    @Published var interfaceName: String = "Unknown"
    @Published var wifiRSSI: String = "N/A"
    @Published var batteryLevel: String = "Unknown"
    @Published var batteryState: String = "Unknown"
    @Published var batteryTimeRemaining: String = "Unknown"
    @Published var batteryCycleCount: String = "Unknown"
    @Published var batteryDesignCapacity: String = "Unknown"
    @Published var batteryCurrentCapacity: String = "Unknown"
    @Published var batteryVoltage: String = "Unknown"
    @Published var batteryAmperage: String = "Unknown"
    @Published var batteryTemperature: String = "Unknown"
    @Published var totalDiskSpace: String = "Unknown"
    @Published var freeDiskSpace: String = "Unknown"
    @Published var usedDiskSpace: String = "Unknown"
    @Published var totalMemory: String = "Unknown"
    @Published var usedMemory: String = "Unknown"
    @Published var freeMemory: String = "Unknown"
    @Published var cpuUsage: String = "Unknown"
    
    private var speedTestURL: URL {
        URL(string: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png")!
    }
    
    init() {
        monitor = NWPathMonitor()
        queue = DispatchQueue.global(qos: .background)
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isConnected = (path.status == .satisfied)
                self.updateNetworkDetails()
                self.updateSignalStrength()
                self.updateBatteryInfo()
                self.updateBatteryDetailedInfo()
                self.updateSystemInfo()
                if self.isConnected {
                    self.startSpeedTest()
                } else {
                    self.downloadSpeed = "No Connection"
                }
            }
        }
        monitor.start(queue: queue)
        let currentPath = monitor.currentPath
        DispatchQueue.main.async {
            self.isConnected = (currentPath.status == .satisfied)
            self.updateNetworkDetails()
            self.updateSignalStrength()
            self.updateBatteryInfo()
            self.updateBatteryDetailedInfo()
            self.updateSystemInfo()
            if self.isConnected {
                self.startSpeedTest()
            } else {
                self.downloadSpeed = "No Connection"
            }
        }
    }
    
    deinit {
        monitor.cancel()
    }
    
    private func updateNetworkDetails() {
        let wifiInterfaces = CWWiFiClient.shared().interfaces() ?? []
        if wifiInterfaces.isEmpty {
            networkName = isConnected ? "Wired Connection" : "No Connection"
            interfaceName = isConnected ? "Ethernet" : "Unknown"
            wifiRSSI = "N/A"
        } else {
            if let activeInterface = wifiInterfaces.first {
                networkName = activeInterface.ssid() ?? "Unknown"
                interfaceName = activeInterface.interfaceName ?? "Unknown"
                let rssiValue = activeInterface.rssiValue()
                wifiRSSI = "\(rssiValue) dBm"
            } else {
                networkName = "Unknown"
                interfaceName = "Unknown"
                wifiRSSI = "N/A"
            }
        }
        ipAddress = Self.getIPAddress()
    }
    
    private func updateSignalStrength() {
        if !isConnected {
            signalStrength = "No Connection"
        } else {
            if downloadSpeed == "Calculating..." || downloadSpeed == "No Connection" {
                signalStrength = "Connected"
            }
        }
    }
    
    private func startSpeedTest() {
        DispatchQueue.global(qos: .background).async {
            self.measureDownloadSpeed()
        }
    }
    
    private func measureDownloadSpeed() {
        let startTime = CFAbsoluteTimeGetCurrent()
        let task = URLSession.shared.dataTask(with: speedTestURL) { data, response, error in
            guard error == nil, let data = data else {
                DispatchQueue.main.async {
                    self.downloadSpeed = "Error"
                    self.signalStrength = "No Connection"
                }
                return
            }
            let elapsedTime = CFAbsoluteTimeGetCurrent() - startTime
            let speedMbps = Double(data.count) / elapsedTime / 1024.0 / 1024.0 * 8.0
            DispatchQueue.main.async {
                self.downloadSpeed = String(format: "%.2f Mbps", speedMbps)
                self.updateSignalStrengthBasedOnSpeed(speedMbps)
            }
        }
        task.resume()
    }
    
    private func updateSignalStrengthBasedOnSpeed(_ speed: Double) {
        switch speed {
        case 0..<1:
            signalStrength = "Poor Connection"
        case 1..<5:
            signalStrength = "Moderate Connection"
        case 5..<20:
            signalStrength = "Good Connection"
        case 20...:
            signalStrength = "Excellent Connection"
        default:
            signalStrength = "Unknown"
        }
    }
    
    private static func getIPAddress() -> String {
        var address = "Unknown"
        var ifaddr: UnsafeMutablePointer<ifaddrs>? = nil
        if getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr {
            var ptr = firstAddr
            while true {
                let interface = ptr.pointee
                if let addr = interface.ifa_addr, addr.pointee.sa_family == UInt8(AF_INET) {
                    let name = String(cString: interface.ifa_name)
                    if name == "en0" {
                        var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                        let saLen = socklen_t(interface.ifa_addr.pointee.sa_len)
                        if getnameinfo(interface.ifa_addr, saLen, &hostname, socklen_t(hostname.count), nil, 0, NI_NUMERICHOST) == 0 {
                            address = String(cString: hostname)
                            break
                        }
                    }
                }
                if let next = interface.ifa_next {
                    ptr = next
                } else {
                    break
                }
            }
            freeifaddrs(ifaddr)
        }
        return address
    }
    
    private func updateBatteryInfo() {
        guard let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let sources = IOPSCopyPowerSourcesList(snapshot)?.takeRetainedValue() as? [CFTypeRef], !sources.isEmpty else {
            return
        }
        for ps in sources {
            if let dict = IOPSGetPowerSourceDescription(snapshot, ps)?.takeUnretainedValue() as? [String: Any] {
                let currentCapacity = dict[kIOPSCurrentCapacityKey as String] as? Int ?? 0
                let maxCapacity = dict[kIOPSMaxCapacityKey as String] as? Int ?? 0
                let percent = Double(currentCapacity) / Double(maxCapacity) * 100
                batteryLevel = String(format: "%.0f%%", percent)
                let state = dict[kIOPSPowerSourceStateKey as String] as? String ?? "Unknown"
                if state == kIOPSACPowerValue as String {
                    batteryState = "AC Power"
                } else {
                    batteryState = "Battery Power"
                }
                let timeToEmpty = dict[kIOPSTimeToEmptyKey as String] as? Int ?? -1
                let timeToFull = dict[kIOPSTimeToFullChargeKey as String] as? Int ?? -1
                if state == kIOPSACPowerValue as String {
                    if timeToFull == -1 {
                        batteryTimeRemaining = "Calculating"
                    } else {
                        batteryTimeRemaining = "\(timeToFull) minutes until full"
                    }
                } else {
                    if timeToEmpty == -1 {
                        batteryTimeRemaining = "Calculating"
                    } else {
                        batteryTimeRemaining = "\(timeToEmpty) minutes remaining"
                    }
                }
            }
        }
    }
    
    private func updateBatteryDetailedInfo() {
        let matching = IOServiceMatching("AppleSmartBattery")
        let service = IOServiceGetMatchingService(kIOMasterPortDefault, matching)
        if service != 0 {
            var properties: Unmanaged<CFMutableDictionary>?
            if IORegistryEntryCreateCFProperties(service, &properties, kCFAllocatorDefault, 0) == KERN_SUCCESS, let props = properties?.takeRetainedValue() as? [String: Any] {
                if let cycleCount = props["CycleCount"] as? Int {
                    batteryCycleCount = "\(cycleCount)"
                }
                if let designCapacity = props["DesignCapacity"] as? Int {
                    batteryDesignCapacity = "\(designCapacity)"
                }
                if let currentCapacity = props["CurrentCapacity"] as? Int {
                    batteryCurrentCapacity = "\(currentCapacity)"
                }
                if let voltage = props["Voltage"] as? Int {
                    batteryVoltage = "\(voltage)"
                }
                if let amperage = props["Amperage"] as? Int {
                    batteryAmperage = "\(amperage)"
                }
                if let temperature = props["Temperature"] as? Int {
                    batteryTemperature = String(format: "%.2f° C", Double(temperature) / 100.0)
                }
            }
            IOObjectRelease(service)
        }
    }
    
    private func updateSystemInfo() {
        updateDiskInfo()
        updateMemoryInfo()
        updateCPUInfo()
    }
    
    private func updateDiskInfo() {
        do {
            let attrs = try FileManager.default.attributesOfFileSystem(forPath: "/")
            if let totalSize = attrs[.systemSize] as? NSNumber, let freeSize = attrs[.systemFreeSize] as? NSNumber {
                let totalDisk = totalSize.int64Value
                let freeDisk = freeSize.int64Value
                let usedDisk = totalDisk - freeDisk
                totalDiskSpace = ByteCountFormatter.string(fromByteCount: totalDisk, countStyle: .file)
                freeDiskSpace = ByteCountFormatter.string(fromByteCount: freeDisk, countStyle: .file)
                usedDiskSpace = ByteCountFormatter.string(fromByteCount: usedDisk, countStyle: .file)
            }
        } catch {
            totalDiskSpace = "Unknown"
            freeDiskSpace = "Unknown"
            usedDiskSpace = "Unknown"
        }
    }
    
    private func updateMemoryInfo() {
        let totalMem = ProcessInfo.processInfo.physicalMemory
        totalMemory = ByteCountFormatter.string(fromByteCount: Int64(totalMem), countStyle: .memory)
        var stats = vm_statistics64()
        var count = mach_msg_type_number_t(HOST_VM_INFO64_COUNT)
        let result = withUnsafeMutablePointer(to: &stats) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }
        if result == KERN_SUCCESS {
            let freeCount = UInt64(stats.free_count + stats.inactive_count)
            let freeMem = freeCount * UInt64(vm_page_size)
            let usedMem = totalMem - freeMem
            freeMemory = ByteCountFormatter.string(fromByteCount: Int64(freeMem), countStyle: .memory)
            usedMemory = ByteCountFormatter.string(fromByteCount: Int64(usedMem), countStyle: .memory)
        } else {
            freeMemory = "Unknown"
            usedMemory = "Unknown"
        }
    }
    
    private func updateCPUInfo() {
        var size = mach_msg_type_number_t(HOST_CPU_LOAD_INFO_COUNT)
        var cpuInfo = host_cpu_load_info()
        let result = withUnsafeMutablePointer(to: &cpuInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(size)) {
                host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &size)
            }
        }
        if result == KERN_SUCCESS {
            let userTicks = Double(cpuInfo.cpu_ticks.0)
            let systemTicks = Double(cpuInfo.cpu_ticks.1)
            let idleTicks = Double(cpuInfo.cpu_ticks.2)
            let niceTicks = Double(cpuInfo.cpu_ticks.3)
            let totalTicks = userTicks + systemTicks + idleTicks + niceTicks
            let usage = 100.0 - (idleTicks / totalTicks * 100.0)
            cpuUsage = String(format: "%.2f%%", usage)
        } else {
            cpuUsage = "Unknown"
        }
    }
}
