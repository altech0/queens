//
//  WordList.swift
//  queens
//
//  Created by Alex on 16/05/2026.
//

import Foundation

struct WordList {
    /// 50 fun, child-safe adjectives
    private static let adjectives = [
        "Happy", "Silly", "Clever", "Brave", "Gentle",
        "Cheerful", "Bright", "Swift", "Proud", "Quiet",
        "Mighty", "Tiny", "Bouncy", "Fuzzy", "Sparkly",
        "Jolly", "Lucky", "Merry", "Peppy", "Snappy",
        "Sunny", "Zippy", "Chipper", "Daring", "Eager",
        "Fancy", "Giddy", "Heroic", "Jazzy", "Keen",
        "Lively", "Noble", "Perky", "Quick", "Radiant",
        "Spry", "Tidy", "Upbeat", "Vivid", "Witty",
        "Excited", "Friendly", "Graceful", "Helpful", "Joyful",
        "Playful", "Peaceful", "Curious", "Cozy", "Dreamy"
    ]
    
    /// 50 pleasant animals
    private static let animals = [
        "Owl", "Fox", "Bear", "Deer", "Rabbit",
        "Otter", "Panda", "Koala", "Penguin", "Dolphin",
        "Butterfly", "Hummingbird", "Squirrel", "Hedgehog", "Swan",
        "Tiger", "Lion", "Elephant", "Giraffe", "Zebra",
        "Kangaroo", "Monkey", "Parrot", "Turtle", "Whale",
        "Eagle", "Hawk", "Robin", "Sparrow", "Finch",
        "Chipmunk", "Raccoon", "Badger", "Beaver", "Moose",
        "Wolf", "Lynx", "Jaguar", "Cheetah", "Leopard",
        "Seal", "Walrus", "Puffin", "Flamingo", "Peacock",
        "Mouse", "Hamster", "Guinea Pig", "Ferret", "Chinchilla"
    ]
    
    /// Generate a random nickname by combining an adjective and an animal
    /// - Returns: A nickname in Title Case format, e.g. "Excited Owl"
    static func randomNickname() -> String {
        let adjective = adjectives.randomElement() ?? "Happy"
        let animal = animals.randomElement() ?? "Owl"
        return "\(adjective) \(animal)"
    }
}
