import SwiftUI
import AppKit

struct ThesaurusEntry: Identifiable, Codable {
    let id = UUID()
    let meta: Meta
    let fl: String
    let syns: [[String]]?
    let ants: [[String]]?
    let def: [Definition]?
    
    struct Meta: Codable {
        let id: String
        let uuid: String?
        let syns: [[String]]?
        let ants: [[String]]?
        let offensive: Bool
    }
    
    struct Definition: Codable {
        let sseq: [[SenseItem]]
    }
    
    enum SenseItem: Codable {
        case sense(Sense)
        case baseSense(BaseSense)
        
        init(from decoder: Decoder) throws {
            var container = try decoder.unkeyedContainer()
            let type = try container.decode(String.self)
            switch type {
            case "sense":
                let sense = try container.decode(Sense.self)
                self = .sense(sense)
            case "bs":
                let baseSense = try container.decode(BaseSense.self)
                self = .baseSense(baseSense)
            default:
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unknown sense item type: \(type)")
            }
        }
        
        func encode(to encoder: Encoder) throws {
            var container = encoder.unkeyedContainer()
            switch self {
            case .sense(let sense):
                try container.encode("sense")
                try container.encode(sense)
            case .baseSense(let baseSense):
                try container.encode("bs")
                try container.encode(baseSense)
            }
        }
    }
    
    struct Sense: Codable {
        let sn: String?
        let dt: [DefinitionText]
    }
    
    struct BaseSense: Codable {
        let sense: Sense
    }
    
    enum DefinitionText: Codable {
        case text(String)
        case syns([[String]])
        
        init(from decoder: Decoder) throws {
            var container = try decoder.unkeyedContainer()
            let label = try container.decode(String.self)
            switch label {
            case "text":
                let text = try container.decode(String.self)
                self = .text(text)
            case "syns":
                let synonyms = try container.decode([[String]].self)
                self = .syns(synonyms)
            default:
                self = .text("")
            }
        }
        
        func encode(to encoder: Encoder) throws {
            var container = encoder.unkeyedContainer()
            switch self {
            case .text(let text):
                try container.encode("text")
                try container.encode(text)
            case .syns(let synonyms):
                try container.encode("syns")
                try container.encode(synonyms)
            }
        }
    }
    
    var word: String {
        cleanText(meta.id.components(separatedBy: ":")[0])
    }
    
    var partOfSpeech: String {
        cleanText(fl)
    }
    
    var synonyms: String {
        if let synList = meta.syns?.flatMap({ $0 }) {
            return cleanText(synList.joined(separator: ", "))
        }
        return cleanText("No synonyms available")
    }
    
    var antonyms: String {
        if let antList = meta.ants?.flatMap({ $0 }) {
            return cleanText(antList.joined(separator: ", "))
        }
        return cleanText("No antonyms available")
    }
    
    private func cleanText(_ text: String) -> String {
        let mutableString = NSMutableString(string: text)
        let tagPattern = #"\{[^}]*\}"#
        if let tagRegex = try? NSRegularExpression(pattern: tagPattern) {
            tagRegex.replaceMatches(in: mutableString, range: NSRange(location: 0, length: mutableString.length), withTemplate: "")
        }
        mutableString.replaceOccurrences(of: "{", with: "", range: NSRange(location: 0, length: mutableString.length))
        mutableString.replaceOccurrences(of: "}", with: "", range: NSRange(location: 0, length: mutableString.length))
        mutableString.replaceOccurrences(of: "\\u2026", with: "…", range: NSRange(location: 0, length: mutableString.length))
        mutableString.replaceOccurrences(of: "\\", with: "", range: NSRange(location: 0, length: mutableString.length))
        var cleanedString = mutableString as String
        cleanedString = cleanedString.replacingOccurrences(of: "  ", with: " ").replacingOccurrences(of: " .", with: ".").replacingOccurrences(of: " ,", with: ",")
        return cleanedString.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

enum ThesaurusEntryResponse: Codable {
    case thesaurus(ThesaurusEntry)
    case suggestion(String)
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let suggestion = try? container.decode(String.self) {
            self = .suggestion(suggestion)
        } else if let thesaurusEntry = try? container.decode(ThesaurusEntry.self) {
            self = .thesaurus(thesaurusEntry)
        } else {
            throw DecodingError.typeMismatch(ThesaurusEntryResponse.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected thesaurus entry or suggestion"))
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .suggestion(let suggestion):
            try container.encode(suggestion)
        case .thesaurus(let thesaurusEntry):
            try container.encode(thesaurusEntry)
        }
    }
}

struct DinoLabsDinoThesaurus: View {
    let geometry: GeometryProxy
    @Binding var leftPanelWidthRatio: CGFloat
    @State private var searchText: String = ""
    @State private var selectedEntry: ThesaurusEntry? = nil
    @State private var entries: [ThesaurusEntry] = []
    private var apiKey: String {
        guard let filePath = Bundle.main.path(forResource: "Secrets", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: filePath) as? [String: Any],
              let key = dict["MW_Thesaurus_API_Key"] as? String else {
            fatalError("API key not found in Secrets.plist")
        }
        return key
    }
    private let baseURL = "https://www.dictionaryapi.com/api/v3/references/thesaurus/json/"
    
    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                ToolTextField(placeholder: "Search thesaurus...", text: $searchText, isSecure: false, textSize: 13, textColor: NSColor.white)
                    .onChange(of: searchText) { newValue in
                        fetchWordSynonyms()
                    }
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .textFieldStyle(PlainTextFieldStyle())
                    .foregroundColor(.white)
                    .font(.system(size: 12, weight: .heavy))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 14)
                    .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3))
                    .containerHelper(backgroundColor: Color(hex: 0x191919), borderColor: Color(hex: 0x616161), borderWidth: 0.5, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                    .hoverEffect(opacity: 0.8)
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(entries) { entry in
                            VStack(alignment: .leading, spacing: 0) {
                                Text(entry.word)
                                    .font(.system(size: 11, weight: .heavy))
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                                    .padding(.bottom, 4)
                                Text(entry.partOfSpeech)
                                    .font(.system(size: 9, weight: .regular).italic())
                                    .foregroundColor(Color(hex: 0xc1c1c1))
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 10)
                            .frame(width: (geometry.size.width * (1 - leftPanelWidthRatio) * 0.3), alignment: .leading)
                            .containerHelper(backgroundColor: Color(hex: 0x313131).opacity(0.8), borderColor: Color(hex: 0x616161), borderWidth: 0.5, topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0, shadowColor: .clear, shadowRadius: 0, shadowX: 0, shadowY: 0)
                            .hoverEffect(opacity: 0.6, cursor: .pointingHand)
                            .background(selectedEntry?.id == entry.id ? Color.blue.opacity(0.2) : Color.clear)
                            .onTapGesture {
                                selectedEntry = entry
                            }
                        }
                    }
                }
            }
            .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.3)
            .background(Color(hex: 0x222222))
            .overlay(
                Rectangle()
                    .frame(width: 2.0)
                    .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.2)),
                alignment: .trailing
            )
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if let entry = selectedEntry {
                        HStack(alignment: .bottom, spacing: 0) {
                            Text(entry.word)
                                .font(.system(size: 36, weight: .semibold))
                                .foregroundColor(Color(hex: 0xc1c1c1))
                                .padding(.trailing, 30)
                            Text("\(entry.partOfSpeech)")
                                .font(.system(size: 22, weight: .regular).italic())
                                .foregroundColor(Color(hex: 0xc1c1c1).opacity(0.9))
                                .padding(.bottom, 5)
                        }
                        .padding(.bottom, 20)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Synonyms:")
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(Color(hex: 0xc1c1c1))
                                .padding(.bottom, 8)
                            Text("\(entry.synonyms)")
                                .font(.system(size: 14, weight: .regular).italic())
                                .foregroundColor(Color(hex: 0xc1c1c1))
                        }
                        .padding(.bottom, 20)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Antonyms:")
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(Color(hex: 0xc1c1c1))
                                .padding(.bottom, 8)
                            Text("\(entry.antonyms)")
                                .font(.system(size: 14, weight: .regular).italic())
                                .foregroundColor(Color(hex: 0xc1c1c1))
                        }
                        .padding(.bottom, 20)
                        Divider()
                    }
                }
                .padding()
                .frame(width: geometry.size.width * (1 - leftPanelWidthRatio) * 0.7)
            }
            .background(Color(hex: 0x171717))
        }
        .onAppear {
            searchText = "fast"
            fetchWordSynonyms()
        }
    }
    
    private func fetchWordSynonyms() {
        guard !searchText.isEmpty else { return }
        let urlString = "\(baseURL)\(searchText)?key=\(apiKey)"
        guard let url = URL(string: urlString) else { return }
        URLSession.shared.dataTask(with: url) { data, response, error in
            if let _ = error {
                return
            }
            guard let data = data else { return }
            do {
                let responses = try JSONDecoder().decode([ThesaurusEntryResponse].self, from: data)
                let thesaurusEntries = responses.compactMap { response -> ThesaurusEntry? in
                    switch response {
                    case .thesaurus(let entry):
                        return entry
                    case .suggestion(_):
                        return nil
                    }
                }
                DispatchQueue.main.async {
                    self.entries = thesaurusEntries
                    self.selectedEntry = thesaurusEntries.first
                }
            } catch {}
        }.resume()
    }
}
