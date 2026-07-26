//
//  StarBattleSolver.swift
//  queens
//
//  A faithful Swift port of the verified JS constraint-propagation solver
//  (scratchpad/starbattle-solver.js — the source of truth). Implements the same
//  teachable techniques and the same nextMove / solve API, producing structured
//  `explain` metadata (region ids / row / column indices, all 0-indexed — no
//  colour names; the UI translates region ids to colours).
//
//  All techniques are SOUND: they only ever assert a star/cross that is logically
//  forced by the current board.
//

import Foundation

// MARK: - Public model

enum SolverCell: Equatable {
    case unknown, star, cross
}

struct SolverPuzzle {
    let n: Int
    let stars: Int
    let regions: [[Int]]   // regions[r][c] = region id
}

enum MoveAction: String, Equatable {
    case star
    case cross

    /// The board cell state this action places.
    var cell: SolverCell { self == .star ? .star : .cross }
}

/// A structured, teachable explanation for a move. Mirrors the JS `explain`
/// object; uses 0-indexed ids/indices and never names colours.
enum MoveExplain: Equatable {
    struct GroupRef: Equatable { let type: GroupType; let id: Int }
    struct LineRef: Equatable { let type: GroupType; let idx: Int } // type is .row or .column

    case adjacency(star: (Int, Int))
    case quotaMet(group: GroupRef)
    case forcedFill(group: GroupRef, need: Int)
    case confinement(direction: ConfinementDirection, region: Int, line: LineRef)
    case setCounting(direction: SetCountingDirection, regions: [Int], lineType: GroupType, lineIdxs: [Int])
    case placement(group: GroupRef, need: Int, role: PlacementRole)
    case hypothetical(group: GroupRef)

    static func == (lhs: MoveExplain, rhs: MoveExplain) -> Bool {
        switch (lhs, rhs) {
        case let (.adjacency(a), .adjacency(b)): return a == b
        case let (.quotaMet(a), .quotaMet(b)): return a == b
        case let (.forcedFill(a, an), .forcedFill(b, bn)): return a == b && an == bn
        case let (.confinement(ad, ar, al), .confinement(bd, br, bl)): return ad == bd && ar == br && al == bl
        case let (.setCounting(ad, ar, at, ai), .setCounting(bd, br, bt, bi)):
            return ad == bd && ar == br && at == bt && ai == bi
        case let (.placement(ag, an, ar), .placement(bg, bn, br)): return ag == bg && an == bn && ar == br
        case let (.hypothetical(a), .hypothetical(b)): return a == b
        default: return false
        }
    }
}

enum GroupType: String, Equatable { case row, column, region }
enum ConfinementDirection: String, Equatable { case regionInLine = "region-in-line", lineInRegion = "line-in-region" }
enum SetCountingDirection: String, Equatable { case regionsInLines = "regions-in-lines", linesInRegions = "lines-in-regions" }
enum PlacementRole: String, Equatable { case neverUsed = "never-used", alwaysUsed = "always-used" }

struct SolverMove {
    let r: Int
    let c: Int
    let action: MoveAction
    let tier: Int
    let explain: MoveExplain
    let reason: String
}

struct SolveResult {
    var board: [[SolverCell]]
    var steps: Int
    var maxTier: Int
}

// MARK: - Solver

enum StarBattleSolver {

    // MARK: Internal group model

    struct Group {
        let type: GroupType
        let idx: Int
        let cells: [(Int, Int)]
    }

    struct Context {
        let n: Int
        let stars: Int
        let regions: [[Int]]
        let groups: [Group]
        /// region ids in first-seen (row-major) order — mirrors JS Map insertion order
        let regionOrder: [Int]
    }

    // MARK: Helpers

    static func neighbors8(_ r: Int, _ c: Int, _ n: Int) -> [(Int, Int)] {
        var out: [(Int, Int)] = []
        for dr in -1...1 {
            for dc in -1...1 {
                if dr == 0 && dc == 0 { continue }
                let rr = r + dr, cc = c + dc
                if rr >= 0 && rr < n && cc >= 0 && cc < n { out.append((rr, cc)) }
            }
        }
        return out
    }

    static func buildGroups(_ n: Int, _ regions: [[Int]]) -> (groups: [Group], regionOrder: [Int]) {
        var groups: [Group] = []
        for r in 0..<n {
            var cells: [(Int, Int)] = []
            for c in 0..<n { cells.append((r, c)) }
            groups.append(Group(type: .row, idx: r, cells: cells))
        }
        for c in 0..<n {
            var cells: [(Int, Int)] = []
            for r in 0..<n { cells.append((r, c)) }
            groups.append(Group(type: .column, idx: c, cells: cells))
        }
        // region cells in first-seen (row-major) insertion order, mirroring JS Map
        var regionOrder: [Int] = []
        var byReg: [Int: [(Int, Int)]] = [:]
        for r in 0..<n {
            for c in 0..<n {
                let id = regions[r][c]
                if byReg[id] == nil { byReg[id] = []; regionOrder.append(id) }
                byReg[id]!.append((r, c))
            }
        }
        for id in regionOrder {
            groups.append(Group(type: .region, idx: id, cells: byReg[id]!))
        }
        return (groups, regionOrder)
    }

    static func makeContext(_ puzzle: SolverPuzzle) -> Context {
        let (groups, order) = buildGroups(puzzle.n, puzzle.regions)
        return Context(n: puzzle.n, stars: puzzle.stars, regions: puzzle.regions, groups: groups, regionOrder: order)
    }

    static func groupStats(_ board: [[SolverCell]], _ cells: [(Int, Int)]) -> (stars: Int, unknown: [(Int, Int)]) {
        var stars = 0
        var unknown: [(Int, Int)] = []
        for (r, c) in cells {
            switch board[r][c] {
            case .star: stars += 1
            case .unknown: unknown.append((r, c))
            case .cross: break
            }
        }
        return (stars, unknown)
    }

    static func glabel(_ g: Group) -> String {
        switch g.type {
        case .row: return "row \(g.idx + 1)"
        case .column: return "column \(g.idx + 1)"
        case .region: return "region \(g.idx + 1)"
        }
    }

    static func gref(_ g: Group) -> MoveExplain.GroupRef { .init(type: g.type, id: g.idx) }
    static func grefLabel(_ ref: MoveExplain.GroupRef) -> String { "\(ref.type.rawValue) \(ref.id + 1)" }
    static func capitalizeFirst(_ s: String) -> String { s.isEmpty ? s : s.prefix(1).uppercased() + s.dropFirst() }

    // MARK: Ordered-unique helpers (mirror JS Set insertion order)

    /// Insertion-ordered set of ints.
    struct OrderedIntSet {
        private(set) var items: [Int] = []
        private var present = Set<Int>()
        mutating func insert(_ x: Int) { if !present.contains(x) { present.insert(x); items.append(x) } }
        func contains(_ x: Int) -> Bool { present.contains(x) }
        var count: Int { items.count }
    }

    static func rowsOf(_ cells: [(Int, Int)]) -> OrderedIntSet {
        var s = OrderedIntSet(); for (r, _) in cells { s.insert(r) }; return s
    }
    static func colsOf(_ cells: [(Int, Int)]) -> OrderedIntSet {
        var s = OrderedIntSet(); for (_, c) in cells { s.insert(c) }; return s
    }

    static func lineNeed(_ board: [[SolverCell]], _ ctx: Context, _ type: GroupType, _ idx: Int) -> Int {
        var s = 0
        if type == .row { for c in 0..<ctx.n where board[idx][c] == .star { s += 1 } }
        else { for r in 0..<ctx.n where board[r][idx] == .star { s += 1 } }
        return ctx.stars - s
    }

    // MARK: - Techniques

    // Tier 0: adjacency
    static func techAdjacency(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        let n = ctx.n
        var moves: [SolverMove] = []
        for r in 0..<n {
            for c in 0..<n where board[r][c] == .star {
                for (rr, cc) in neighbors8(r, c, n) where board[rr][cc] == .unknown {
                    moves.append(SolverMove(r: rr, c: cc, action: .cross, tier: 0,
                        explain: .adjacency(star: (r, c)),
                        reason: "Adjacent to the star at R\(r + 1)C\(c + 1), so it can't be a star."))
                }
            }
        }
        return moves
    }

    // Tier 1: quota met
    static func techQuotaMet(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        var moves: [SolverMove] = []
        for g in ctx.groups {
            let (s, unknown) = groupStats(board, g.cells)
            if s == ctx.stars && !unknown.isEmpty {
                for (r, c) in unknown {
                    moves.append(SolverMove(r: r, c: c, action: .cross, tier: 1,
                        explain: .quotaMet(group: gref(g)),
                        reason: "\(capitalizeFirst(glabel(g))) already has its \(ctx.stars) star\(ctx.stars > 1 ? "s" : ""), so this must be a cross."))
                }
            }
        }
        return moves
    }

    // Tier 1: forced fill
    static func techForcedFill(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        var moves: [SolverMove] = []
        for g in ctx.groups {
            let (s, unknown) = groupStats(board, g.cells)
            let need = ctx.stars - s
            if need > 0 && unknown.count == need {
                for (r, c) in unknown {
                    moves.append(SolverMove(r: r, c: c, action: .star, tier: 1,
                        explain: .forcedFill(group: gref(g), need: need),
                        reason: "\(capitalizeFirst(glabel(g))) needs \(need) more star\(need > 1 ? "s" : "") and has exactly \(need) open cell\(need > 1 ? "s" : "") left."))
                }
            }
        }
        return moves
    }

    // Tier 2: region confinement
    static func techRegionConfinement(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        let n = ctx.n
        var moves: [SolverMove] = []
        for g in ctx.groups where g.type == .region {
            let (s, unknown) = groupStats(board, g.cells)
            let need = ctx.stars - s
            if need <= 0 || unknown.isEmpty { continue }
            let rs = rowsOf(unknown)
            if rs.count == 1 {
                let r = rs.items[0]
                if lineNeed(board, ctx, .row, r) == need {
                    for c in 0..<n where board[r][c] == .unknown && ctx.regions[r][c] != g.idx {
                        moves.append(SolverMove(r: r, c: c, action: .cross, tier: 2,
                            explain: .confinement(direction: .regionInLine, region: g.idx, line: .init(type: .row, idx: r)),
                            reason: "Region \(g.idx + 1)'s \(need) remaining star\(need > 1 ? "s" : "") must all lie in row \(r + 1), filling that row's quota, so the rest of row \(r + 1) can't hold a star."))
                    }
                }
            }
            let cs = colsOf(unknown)
            if cs.count == 1 {
                let c = cs.items[0]
                if lineNeed(board, ctx, .column, c) == need {
                    for r in 0..<n where board[r][c] == .unknown && ctx.regions[r][c] != g.idx {
                        moves.append(SolverMove(r: r, c: c, action: .cross, tier: 2,
                            explain: .confinement(direction: .regionInLine, region: g.idx, line: .init(type: .column, idx: c)),
                            reason: "Region \(g.idx + 1)'s \(need) remaining star\(need > 1 ? "s" : "") must all lie in column \(c + 1), filling that column's quota, so the rest of column \(c + 1) can't hold a star."))
                    }
                }
            }
        }
        return moves
    }

    // Tier 2: line confinement (inverse)
    static func techLineConfinement(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        let n = ctx.n
        var moves: [SolverMove] = []
        for g in ctx.groups where g.type == .row || g.type == .column {
            let (s, unknown) = groupStats(board, g.cells)
            let need = ctx.stars - s
            if need <= 0 || unknown.isEmpty { continue }
            var regs = OrderedIntSet()
            for (r, c) in unknown { regs.insert(ctx.regions[r][c]) }
            if regs.count == 1 {
                let id = regs.items[0]
                var rs = 0
                for r in 0..<n {
                    for c in 0..<n where ctx.regions[r][c] == id {
                        if board[r][c] == .star { rs += 1 }
                    }
                }
                let regNeed = ctx.stars - rs
                if regNeed != need { continue }
                for r in 0..<n {
                    for c in 0..<n {
                        if board[r][c] != .unknown || ctx.regions[r][c] != id { continue }
                        let inLine = g.type == .row ? r == g.idx : c == g.idx
                        if !inLine {
                            moves.append(SolverMove(r: r, c: c, action: .cross, tier: 2,
                                explain: .confinement(direction: .lineInRegion, region: id, line: .init(type: g.type, idx: g.idx)),
                                reason: "\(capitalizeFirst(glabel(g)))'s \(need) remaining star\(need > 1 ? "s" : "") must all lie in region \(id + 1), filling that region's quota, so region \(id + 1)'s cells outside \(glabel(g)) can't hold a star."))
                        }
                    }
                }
            }
        }
        return moves
    }

    // Tier 3: generalized N-sets-in-N-lines counting
    static let maxSetN = 5

    static func techSetCounting(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        let n = ctx.n, stars = ctx.stars, regions = ctx.regions
        var moves: [SolverMove] = []

        // Precompute per-region info in first-seen order.
        struct RegionInfo { let id: Int; let need: Int; let unknown: [(Int, Int)]; let rows: OrderedIntSet; let cols: OrderedIntSet }
        var regByStars: [Int: Int] = [:]
        var regUnknown: [Int: [(Int, Int)]] = [:]
        for r in 0..<n {
            for c in 0..<n {
                let id = regions[r][c]
                if board[r][c] == .star { regByStars[id, default: 0] += 1 }
                else if board[r][c] == .unknown { regUnknown[id, default: []].append((r, c)) }
            }
        }
        var regionInfo: [RegionInfo] = []
        for id in ctx.regionOrder {
            let sc = regByStars[id] ?? 0
            let need = stars - sc
            let unk = regUnknown[id] ?? []
            if need <= 0 || unk.isEmpty { continue }
            regionInfo.append(RegionInfo(id: id, need: need, unknown: unk, rows: rowsOf(unk), cols: colsOf(unk)))
        }

        // line capacities
        var rowCap = [Int](repeating: 0, count: n), colCap = [Int](repeating: 0, count: n)
        for i in 0..<n {
            var rs = 0, cs = 0
            for j in 0..<n {
                if board[i][j] == .star { rs += 1 }
                if board[j][i] == .star { cs += 1 }
            }
            rowCap[i] = stars - rs; colCap[i] = stars - cs
        }

        // Forms 1 & 2: N regions confined to N rows / N columns
        for orient in [GroupType.row, GroupType.column] {
            let cap = orient == .row ? rowCap : colCap
            let cand = regionInfo.filter { (orient == .row ? $0.rows.count : $0.cols.count) <= Self.maxSetN }
            forEachSubset(cand, minK: 2, maxK: Self.maxSetN) { subset in
                var lines = OrderedIntSet()
                var needSum = 0
                for ri in subset {
                    let items = orient == .row ? ri.rows.items : ri.cols.items
                    for l in items { lines.insert(l) }
                    needSum += ri.need
                }
                if lines.count != subset.count { return }
                var capSum = 0
                for l in lines.items { capSum += cap[l] }
                if needSum != capSum { return }
                var regIds = OrderedIntSet()
                for ri in subset { regIds.insert(ri.id) }
                for l in lines.items {
                    for t in 0..<n {
                        let r = orient == .row ? l : t
                        let c = orient == .row ? t : l
                        if board[r][c] == .unknown && !regIds.contains(regions[r][c]) {
                            moves.append(SolverMove(r: r, c: c, action: .cross, tier: 3,
                                explain: .setCounting(direction: .regionsInLines, regions: regIds.items, lineType: orient, lineIdxs: lines.items),
                                reason: "Regions \(regIds.items.map { String($0 + 1) }.joined(separator: ", ")) are confined to \(orient == .row ? "rows" : "columns") \(lines.items.map { String($0 + 1) }.joined(separator: ", ")) and fill their stars, so other cells there can't hold a star."))
                        }
                    }
                }
            }
        }

        // Forms 3 & 4: N rows / N columns confined to N regions
        for orient in [GroupType.row, GroupType.column] {
            struct LineInfo { let idx: Int; let need: Int; let unknown: [(Int, Int)]; let regs: OrderedIntSet }
            var lineInfo: [LineInfo] = []
            for i in 0..<n {
                let need = (orient == .row ? rowCap : colCap)[i]
                if need <= 0 { continue }
                var unknown: [(Int, Int)] = []
                for j in 0..<n {
                    let r = orient == .row ? i : j
                    let c = orient == .row ? j : i
                    if board[r][c] == .unknown { unknown.append((r, c)) }
                }
                if unknown.isEmpty { continue }
                var regs = OrderedIntSet()
                for (r, c) in unknown { regs.insert(regions[r][c]) }
                if regs.count <= Self.maxSetN { lineInfo.append(LineInfo(idx: i, need: need, unknown: unknown, regs: regs)) }
            }
            forEachSubset(lineInfo, minK: 2, maxK: Self.maxSetN) { subset in
                var regsUnion = OrderedIntSet()
                var needSum = 0
                for li in subset { for gg in li.regs.items { regsUnion.insert(gg) }; needSum += li.need }
                if regsUnion.count != subset.count { return }
                var capSum = 0
                for id in regsUnion.items { capSum += stars - (regByStars[id] ?? 0) }
                if needSum != capSum { return }
                var lineIdxs = OrderedIntSet()
                for li in subset { lineIdxs.insert(li.idx) }
                for id in regsUnion.items {
                    for (r, c) in (regUnknown[id] ?? []) {
                        let inLine = orient == .row ? lineIdxs.contains(r) : lineIdxs.contains(c)
                        if !inLine {
                            moves.append(SolverMove(r: r, c: c, action: .cross, tier: 3,
                                explain: .setCounting(direction: .linesInRegions, regions: regsUnion.items, lineType: orient, lineIdxs: lineIdxs.items),
                                reason: "\(orient == .row ? "Rows" : "Columns") \(lineIdxs.items.map { String($0 + 1) }.joined(separator: ", ")) confine their stars to regions \(regsUnion.items.map { String($0 + 1) }.joined(separator: ", ")) and fill them, so those regions' cells outside those \(orient == .row ? "rows" : "columns") can't hold a star."))
                        }
                    }
                }
            }
        }

        return moves
    }

    /// Enumerate subsets of `arr` with size in [minK, maxK], invoking cb.
    /// Mirrors the JS forEachSubset recursion order exactly.
    static func forEachSubset<T>(_ arr: [T], minK: Int, maxK: Int, _ cb: ([T]) -> Void) {
        let m = arr.count
        let hi = min(maxK, m)
        var idx: [Int] = []
        func rec(_ start: Int, _ depth: Int) {
            if depth >= minK { cb(idx.map { arr[$0] }) }
            if depth == hi { return }
            var i = start
            while i < m { idx.append(i); rec(i + 1, depth + 1); idx.removeLast(); i += 1 }
        }
        rec(0, 0)
    }

    // Tier 3: within-group placement enumeration ("dominoes / star pairs")
    static let pairMaxCandidates = 16

    static func techPairExclusion(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        let n = ctx.n, stars = ctx.stars
        var moves: [SolverMove] = []
        for g in ctx.groups {
            let (s, unknown) = groupStats(board, g.cells)
            let need = stars - s
            if need < 2 || unknown.count <= need { continue }
            if unknown.count > Self.pairMaxCandidates { continue }
            let cand = unknown.filter { (r, c) in
                for (rr, cc) in neighbors8(r, c, n) where board[rr][cc] == .star { return false }
                return true
            }
            if cand.count < need { continue }
            let m = cand.count
            var adj = [[Int]](repeating: [], count: m)
            for i in 0..<m {
                for j in (i + 1)..<m {
                    if abs(cand[i].0 - cand[j].0) <= 1 && abs(cand[i].1 - cand[j].1) <= 1 { adj[i].append(j); adj[j].append(i) }
                }
            }
            var usedCount = [Int](repeating: 0, count: m)
            var placements = 0
            var chosen: [Int] = []
            var blocked = [Int](repeating: 0, count: m)
            var overflow = false
            func rec(_ start: Int, _ depth: Int) {
                if overflow { return }
                if depth == need {
                    placements += 1
                    if placements > 20000 { overflow = true; return }
                    for i in chosen { usedCount[i] += 1 }
                    return
                }
                var i = start
                while i < m {
                    if blocked[i] == 0 {
                        chosen.append(i)
                        for j in adj[i] { blocked[j] += 1 }
                        rec(i + 1, depth + 1)
                        for j in adj[i] { blocked[j] -= 1 }
                        chosen.removeLast()
                    }
                    i += 1
                }
            }
            rec(0, 0)
            if overflow || placements == 0 { continue }
            for i in 0..<m {
                let (r, c) = cand[i]
                if usedCount[i] == 0 {
                    moves.append(SolverMove(r: r, c: c, action: .cross, tier: 3,
                        explain: .placement(group: gref(g), need: need, role: .neverUsed),
                        reason: "No valid arrangement of \(glabel(g))'s \(need) stars can place one at R\(r + 1)C\(c + 1), so it must be a cross."))
                } else if usedCount[i] == placements {
                    moves.append(SolverMove(r: r, c: c, action: .star, tier: 3,
                        explain: .placement(group: gref(g), need: need, role: .alwaysUsed),
                        reason: "Every valid arrangement of \(glabel(g))'s \(need) stars places one at R\(r + 1)C\(c + 1), so it must be a star."))
                }
            }
        }
        return moves
    }

    // Tier 4: hypothetical exclusion (look-ahead, NOT teachable)
    static func techHypotheticalExclusion(_ board: [[SolverCell]], _ ctx: Context) -> [SolverMove] {
        let n = ctx.n
        var moves: [SolverMove] = []
        for r in 0..<n {
            for c in 0..<n where board[r][c] == .unknown {
                var asStar = board
                asStar[r][c] = .star
                if let badA = cheapPropagate(&asStar, ctx) {
                    moves.append(SolverMove(r: r, c: c, action: .cross, tier: 4,
                        explain: .hypothetical(group: badA),
                        reason: "Placing a star at R\(r + 1)C\(c + 1) would leave \(grefLabel(badA)) unable to place its stars, so it must be a cross."))
                    continue
                }
                var asCross = board
                asCross[r][c] = .cross
                if let badB = cheapPropagate(&asCross, ctx) {
                    moves.append(SolverMove(r: r, c: c, action: .star, tier: 4,
                        explain: .hypothetical(group: badB),
                        reason: "Crossing R\(r + 1)C\(c + 1) would leave \(grefLabel(badB)) unable to place its stars, so it must be a star."))
                }
            }
        }
        return moves
    }

    // Apply only SOUND forced moves repeatedly. Returns the offending group ref if
    // a contradiction is detected, or nil at a consistent fixpoint. Mutates `b`.
    static func cheapPropagate(_ b: inout [[SolverCell]], _ ctx: Context) -> MoveExplain.GroupRef? {
        let n = ctx.n, stars = ctx.stars
        while true {
            if let bad = inconsistentGroup(b, ctx) { return bad }
            var changed = false
            // adjacency
            for r in 0..<n {
                for c in 0..<n where b[r][c] == .star {
                    for (rr, cc) in neighbors8(r, c, n) where b[rr][cc] == .unknown { b[rr][cc] = .cross; changed = true }
                }
            }
            // quota met -> cross rest; forced fill -> star
            for g in ctx.groups {
                let (s, unknown) = groupStats(b, g.cells)
                if s == stars && !unknown.isEmpty {
                    for (r, c) in unknown { b[r][c] = .cross; changed = true }
                } else {
                    let need = stars - s
                    if need > 0 && unknown.count == need {
                        for (r, c) in unknown { b[r][c] = .star; changed = true }
                    }
                }
            }
            // confinement + set-counting deepen the look-ahead
            for mv in techRegionConfinement(b, ctx) where b[mv.r][mv.c] == .unknown { b[mv.r][mv.c] = mv.action.cell; changed = true }
            for mv in techLineConfinement(b, ctx) where b[mv.r][mv.c] == .unknown { b[mv.r][mv.c] = mv.action.cell; changed = true }
            for mv in techSetCounting(b, ctx) where b[mv.r][mv.c] == .unknown { b[mv.r][mv.c] = mv.action.cell; changed = true }
            if !changed { return inconsistentGroup(b, ctx) }
        }
    }

    // Returns the first group proving inconsistency, or nil if consistent.
    static func inconsistentGroup(_ b: [[SolverCell]], _ ctx: Context) -> MoveExplain.GroupRef? {
        let n = ctx.n, stars = ctx.stars
        for g in ctx.groups {
            var s = 0
            var open: [(Int, Int)] = []
            for (r, c) in g.cells {
                switch b[r][c] {
                case .star: s += 1
                case .unknown: open.append((r, c))
                case .cross: break
                }
            }
            if s > stars { return gref(g) }
            let need = stars - s
            if need == 0 { continue }
            if open.count < need { return gref(g) }
            if maxIndependent(open, cap: need) < need { return gref(g) }
        }
        // no two adjacent placed stars (report the row containing the first star)
        for r in 0..<n {
            for c in 0..<n where b[r][c] == .star {
                for (rr, cc) in neighbors8(r, c, n) where b[rr][cc] == .star {
                    return .init(type: .row, id: r)
                }
            }
        }
        return nil
    }

    // Max pairwise non-adjacent (king-move) cells, capped at `cap`.
    static func maxIndependent(_ cells: [(Int, Int)], cap: Int) -> Int {
        let m = cells.count
        var adj = [[Int]](repeating: [], count: m)
        for i in 0..<m {
            for j in (i + 1)..<m where abs(cells[i].0 - cells[j].0) <= 1 && abs(cells[i].1 - cells[j].1) <= 1 {
                adj[i].append(j); adj[j].append(i)
            }
        }
        var best = 0
        var blocked = [Int](repeating: 0, count: m)
        func bt(_ i: Int, _ count: Int) -> Bool {
            if count >= cap { best = count; return true }
            if best >= cap { return true }
            if i == m { if count > best { best = count }; return false }
            if count + (m - i) < cap && count + (m - i) <= best { if count > best { best = count }; return false }
            if blocked[i] == 0 {
                for j in adj[i] { blocked[j] += 1 }
                if bt(i + 1, count + 1) { for j in adj[i] { blocked[j] -= 1 }; return true }
                for j in adj[i] { blocked[j] -= 1 }
            }
            return bt(i + 1, count)
        }
        _ = bt(0, 0)
        return best
    }

    // MARK: - Technique registry

    struct Technique { let fn: ([[SolverCell]], Context) -> [SolverMove]; let teachable: Bool }

    static let techniques: [Technique] = [
        Technique(fn: techAdjacency,             teachable: true),
        Technique(fn: techQuotaMet,              teachable: true),
        Technique(fn: techForcedFill,            teachable: true),
        Technique(fn: techRegionConfinement,     teachable: true),
        Technique(fn: techLineConfinement,       teachable: true),
        Technique(fn: techSetCounting,           teachable: true),
        Technique(fn: techPairExclusion,         teachable: true),
        Technique(fn: techHypotheticalExclusion, teachable: false),
    ]

    // MARK: - Public API

    /// The single next forced move given the current board, computed fresh.
    /// Lowest-cost technique first. `teachableOnly` skips the look-ahead technique.
    static func nextMove(board: [[SolverCell]], puzzle: SolverPuzzle, teachableOnly: Bool = false) -> SolverMove? {
        let ctx = makeContext(puzzle)
        for tech in techniques {
            if teachableOnly && !tech.teachable { continue }
            let moves = tech.fn(board, ctx)
            for m in moves where board[m.r][m.c] == .unknown { return m }
        }
        return nil
    }

    /// Full solve from an optional starting board. Returns final board + steps + maxTier.
    static func solve(puzzle: SolverPuzzle, startBoard: [[SolverCell]]? = nil, teachableOnly: Bool = false) -> SolveResult {
        let n = puzzle.n
        var board = startBoard ?? [[SolverCell]](repeating: [SolverCell](repeating: .unknown, count: n), count: n)
        let ctx = makeContext(puzzle)
        var steps = 0
        var maxTier = -1
        while true {
            var applied = false
            for tech in techniques {
                if teachableOnly && !tech.teachable { continue }
                let moves = tech.fn(board, ctx)
                for m in moves where board[m.r][m.c] == .unknown {
                    board[m.r][m.c] = m.action.cell
                    steps += 1
                    if m.tier > maxTier { maxTier = m.tier }
                    applied = true
                }
                if applied { break }
            }
            if !applied { break }
        }
        return SolveResult(board: board, steps: steps, maxTier: maxTier)
    }

    static func isComplete(board: [[SolverCell]], n: Int) -> Bool {
        for r in 0..<n { for c in 0..<n where board[r][c] == .unknown { return false } }
        return true
    }
}
