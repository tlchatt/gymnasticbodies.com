export const SettingsJson = {//Work in progress, Hardcoded values (no computation here)
    Screens: {
        "isActive": "10px",
        "isLargeMobile": "400px",
        "isSmall": "640px",
        "isLarge": "1024px",
        "isXLarge": "1536px",
        "isHD": "1900px",
    },
    Margin: {
        "high": ['3.5rem', '2.5rem', '2rem', '2rem', '2rem', '2rem'],
        "standard": ['2.5vw', '2.5vw', '2.5vw', '5vw', '5vw', '5vw'],//One for each breakpoint plus one for pre breakpoint, High to low.
        "low": ['2.5vw', '1.25vw', '1.25vw', '2.5vw', '2.5vw', '2.5vw'],
        "tmp": ['isHD', 'isXLarge', 'isLarge', 'isSmall', 'isLargeMobile', 'isActive']
    },
    Padding: {
        "high": ['3.5rem', '2.5rem', '2rem', '2rem', '2rem', '2rem'],
        "standard": ['2.5rem', '1.5rem', '1.5rem', '1.5rem', '1.5rem', '1.5rem'],//One for each breakpoint plus one for pre breakpoint, High to low.
        "low": ['1.5rem', '.75rem', '.75rem', '.75rem', '.75rem', '.75rem'],
        "lowest": ['0.825rem', '0.625rem', '0.5rem', '0.5rem', '0.5rem'],
        "tmp": ['isHD', 'isXLarge', 'isLarge', 'isSmall', 'isLargeMobile', 'isActive']
    },
    OldGap: {
        "high": ['5.5rem', '4rem', '3.5rem', '3rem', '2rem', '2rem'],
        "standard": ['3vw', '2.5vw', '1.25vw', '5vw', '5vw', '5vw'],//One for each breakpoint plus one for pre breakpoint, High to low.
        "low": ['1vw', '1.25vw', '0.625vw', '2.5vw', '2.5vw', '2.5vw'],
        "lowest": ['1.25vw', '0.625vw', '0.3125vw', '1.25vw', '1.25vw', '1.25vw'],
        "tmp": ['isHD', 'isXLarge', 'isLarge', 'isSmall', 'isLargeMobile', 'isActive']
    },
    Gap: {
        "high": ['5.5em', '4em', '3.5em', '3em', '2em', '2em'],
        "standard": ['2em', '2em', '2em', '1.5em', '1.5em', '1.5em'],//One for each breakpoint plus one for pre breakpoint, High to low.
        "low": ['1em', '1em', '1em', '.75em', '.75em', '.75em'],
        "lowest": ['.5em', '.5em', '.5em', '.35em', '.35em', '.35em'],
        "tmp": ['isHD', 'isXLarge', 'isLarge', 'isSmall', 'isLargeMobile', 'isActive']
    },
    Width: {
        "isActive": "85vw", //Computes to 90vw on mobile with 5vw margins. Perhaps this just becomes the desired 90. 
        "isLargeMobile": "85vw",
        "isSmall": "85vw",
        "isLarge": "80vw",
        "isXLarge": "75vw",
        "isHD": "70vw",
    }
}