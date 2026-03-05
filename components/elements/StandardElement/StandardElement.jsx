/* Text tag micro components
*  Try these default styles first
*  Always handle alignment, margins, padding, in parent
*  Overide default clases some other way, they do not always overide, maybe overwrite other classes? Inlne styles is not an option becaue of media query issues (no responsive inline styles). 
alignment classes (? Should these be handled by paretn like in text block)
* In Sync with tailwind 06/22/2023
* In Sync with prismaMaterializeImageCompoenent 06/22/2023
*/

import { GetSettings } from "@/lib/GetSettings.js";
import { useState } from 'react';
export const StandardElement = (props) => {
    let { Settings, Style, Media } = GetSettings(props, "StandardElement");

    const [engaged, setEngaged] = useState(false)
    const handleEngage = (e) => {
        // console.log("Engaged:", e.type, engaged, "Event Target tagName:", e.target.tagName);
        setEngaged(!engaged)
    }
    function OnClick(e) {
        if (props.onClick) {
            props.onClick(e)
            return
        }

        else { return handleEngage() }
    }
    let tag = props.data.tag ? props.data.tag : 'p'
    let Fonts = getFontSettings()
    let Children = cleanChildren()
    let linkStyle = {
        ...Style,
        color: Fonts.color,
        //borderRadius: '4px',
        borderBottom: (engaged) ? `2px solid ${Style.fgaccent}` : 'unset',
       //outlineOffset: engaged ? `2px` : 'unset',
        textDecoration: (Settings.scheme === 'secondary') ? 'underline' : (Settings.scheme === 'quaternary') ? 'underline' : 'unset',
        textUnderlineOffset: (Settings.scheme === 'secondary') ? '.25em' : (Settings.scheme === 'quaternary') ? '.25em' : 'unset'
    }
    let tagStyle = {
        ...Style,
        color: Fonts.color,
        fontSize: Fonts.fontSize,
        fontWeight: Fonts.fontWeight,
        lineHeight: '150%',
        listStyle: props.data.svg == 'download' ? `url(/images/download.png)` : props.data.svg == 'external' ? `url(/images/icon-retweet3.png)` : (tag == "li") ? `url(/images/list-bullet.gif)` : null,
        listStylePosition: 'inside'
        // GW: margin: (tag === "ul") ? '0 0 0 1.25em' : null,
        // listStyle: (tag == "li") ? "circle" : null,
    }
    
    return (/**ideal system */
        <>
            {props.data.href && !(props.data.tag == 'a') &&
                <a href={props.data.href} className={`${Settings.className} FeaturedTextLink`} id={Settings.id} style={linkStyle}
                    onClick={OnClick}
                    onMouseEnter={e => handleEngage(e)}
                    onMouseLeave={e => handleEngage(e)}>
                    <props.data.tag style={tagStyle} id={Settings.innerID}>
                        {props.data?.text || "StandardElement"}
                    </props.data.tag>
                </a>
            }
            {props.data.tag === 'a' &&
                <a href={props.data.href} className={`${Settings.className} FeaturedTextLink`} id={Settings.id} style={{ ...tagStyle, ...linkStyle }}
                    onClick={OnClick}
                    onMouseEnter={e => handleEngage(e)}
                    onMouseLeave={e => handleEngage(e)}>
                    {props.data?.text || "StandardElement"}
                </a>
            }
            {!props.data.href && props.data.tag != 'a' &&
                <props.data.tag onClick={OnClick} style={tagStyle} id={Settings.id}>
                    {props.data?.text || "StandardElement"}
                    {Children &&
                        Children
                    }
                </props.data.tag>
            }
        </>
    )
    function getFontSettings() {
        let Screens = {
            "isActive": "10px",
            "isLargeMobile": "400px",
            "isSmall": "640px",
            "isLarge": "1024px",
            "isXLarge": "1536px",
            "isHD": "1900px",
        }
        let fontSizeh2 = (Media.isHD) ? '36px' : (Media.isXLarge) ? '31px' : (Media.isLarge) ? '24px' : (Media.isSmall) ? '21px' : (Media.isLargeMobile) ? '19px' : '19px'
        let fontWeighth2 = '625'

        let fontSizeh3 = (Media.isHD) ? '34px' : (Media.isXLarge) ? '29px' : (Media.isLarge) ? '23px' : (Media.isSmall) ? '20px' : (Media.isLargeMobile) ? '18px' : '18px'
        let fontWeighth3 = '625'

        let fontSizeBlockquote = (Media.isHD) ? '36px' : (Media.isXLarge) ? '31px' : (Media.isLarge) ? '24px' : (Media.isSmall) ? '21px' : (Media.isLargeMobile) ? '19px' : '19px'
        let fontWeigthBlockquote = '625'

        /*let fontSizeStrong = (Media.isHD) ? '36px' : (Media.isXLarge) ? '31px' : (Media.isLarge) ? '24px' : (Media.isSmall) ? '21px' : (Media.isLargeMobile) ? '19px' : '19px'*/
        let fontSizeStrong = 'inherit'
        let fontWeightStrong = 'inherit'

        let fontSizep = (Media.isHD) ? '19px' : (Media.isXLarge) ? '18px' : (Media.isLarge) ? '17px' : (Media.isSmall) ? '16px' : (Media.isLargeMobile) ? '15px' : '14px'
        let fontWeightp = '550'

        let fontSizeli = (Media.isHD) ? '19px' : (Media.isXLarge) ? '18px' : (Media.isLarge) ? '17px' : (Media.isSmall) ? '16px' : (Media.isLargeMobile) ? '15px' : '14px'
        let fontWeightli = '550'

        let color = props.data.href ? Style.fgaccent : (props.data.tag === 'strong') ? Style.fgaccent : Style.color

        let Fonts = {
            fontSize: (tag === "h2") ? fontSizeh2 : (tag === "h3") ? fontSizeh3 : (tag === "p") ? fontSizep : (tag === "li") ? fontSizeli : (tag === "blockquote") ? fontSizeBlockquote : (tag === "strong") ? fontSizeStrong : fontSizep,
            fontWeight: (tag === "h2") ? fontWeighth2 : (tag === "h3") ? fontWeighth3 : (tag === "p") ? fontWeightp : (tag === "li") ? fontWeightli : (tag === "blockquote") ? fontWeigthBlockquote : (tag === "strong") ? fontWeightStrong : fontWeightp,
            color: color
        }
        if (props.data.small) {
            let numericFont = Fonts.fontSize.replace("px", "")
            numericFont = numericFont * .75
            Fonts.fontSize = `${numericFont}px`
        }
          if (props.data.large) {
            let numericFont = Fonts.fontSize.replace("px", "")
            numericFont = numericFont * 1.25
            Fonts.fontSize = `${numericFont}px`
        }
        return Fonts

    }
    function cleanChildren() {
        let acceptableChildren = []
        if (props.children) {
            for (let [index, child] of props.children.entries()) {
                if (typeof (child) === 'object') {
                    acceptableChildren.push(child)
                }
            }
        }
        if (acceptableChildren.length > 0) {
            return acceptableChildren
        }
        else {
            return null
        }

    }
}