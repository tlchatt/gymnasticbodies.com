'use client'
import { Colors } from "@/lib/Colors.js";
import { useMediaQuery } from "@/lib/MediaQueries";
import { useState } from 'react';
import { SettingsJson } from '@/data/Settings'
import { Appearance } from "@/data/Appearance.jsx";
export function GetSettings({ id, innerID, className, innerClassName, style, innerStyle, textStyle, linkStyle, ref, innerRef, scheme, middleChild, lastChild, parentContainer, parentContainerSize, data, index, page, onClick, log }, name, element) {
    //Usage: GetSettings(props, "name", 'tag');
    const [engaged, setEngaged] = useState(false)/* GW How to do this without creatng state for non engageable build error when placed in if statement*/
    const handleEngaged = (e) => {
        setEngaged(!engaged)
    }
    log === true && console.log("\n\n\n -------- GetSettings (begin) -------- \n\n ")
    log === true && console.log("--------> Props", "\n name:", `${id ? `${id}->` : ''}${name}`, "\n scheme:", scheme, "\n data:", data, "\n page:", page, "\n index:", index, "\n parentContainer:", parentContainer, "\n parentContainerSize:", parentContainerSize, "\n middleChild:", middleChild, "\nlastChild:", lastChild, "\nengaged", engaged)

    let { Screens, Margin, Padding, Gap, Width } = SettingsJson
    let Returns = {
    };
    Returns.Relation = GetRelation() /* parentContainer, parentContainerSize, middleChild (no-margin), lastChild (bottom-margin) */
    Returns.Media = GetMedia() /* Media Queries as Var */
    Returns.Settings = GetSettings()/* General Elements Settings (not applied), Width id, class, ref, scheme, marign, padding, gap */
    Returns.Style = GetStyle(style);/* General Elements Styles (for direct application as style) */
    Returns.InnerStyle = GetStyle(innerStyle);/* General Elements Styles (for direct application as style) */
    Returns.TextStyle = GetTextStyle()/** Text Element (h1-5, p, ul, li, b, strong, i), Styles, Colors and Font Size and Weight */
    Returns.LinkStyle = GetLinkStyle(linkStyle)/** Link Element (a), Event & Engagement + Styles, Colors and Font Size and Weight */
    Returns.ElementProps = element ? GetElementProps() : null // Conditional Access
    log === true && console.log("--------> Returns", "\n name:", `${id ? `${id}->` : ''}${name}`, Returns)
    log === true && console.log("\n\n -------- GetSettings (end) -------- \n\n\n ")
    return Returns

    function GetRelation() {
        let PreviousSection = page?.[index - 1]
        let NextSection = page?.[index + 1]
        let PreviousSectionScheme = PreviousSection?.scheme
        if (PreviousSection && !PreviousSectionScheme) { PreviousSectionScheme = 'primary' }
        let CurrentScheme = scheme ? scheme : "primary"
        let NextSectionScheme = NextSection?.scheme // Null if no item, primary if no scheme
        if (NextSection && !NextSectionScheme) { NextSectionScheme = 'primary' }
        if (log == true) {
            console.log("----> GetRelation")
            console.log('page', page)
            console.log('index', index)
            console.log('PreviousSectionScheme', PreviousSectionScheme)
            console.log('CurrentScheme', CurrentScheme)
            console.log('NextSectionScheme', NextSectionScheme)
        }
        let Relation = {
            middleChild: middleChild ? middleChild : false,
            lastChild: lastChild ? lastChild : false,
            parentContainer: parentContainer, //currently not computed dynamically but manually passed
            parentContainerSize: parentContainerSize, //currently not computed dynamically but manually passed
        }
        log === true && console.log('\n Relation init', Relation)
        if (middleChild || lastChild || index === 0) { // Don't need to calculate if pre-defined or first element in page
            log === true && console.log(`\n if (middleChild || lastChild || index === 0)`,)
            return Relation
        }
        if (!(NextSectionScheme) && !(PreviousSectionScheme)) { // No scheme in theory start here
            log === true && console.log(`\n !(NextSectionScheme) && !(PreviousSectionScheme)`,)
            return Relation
        }
        Relation.middleChild = (PreviousSectionScheme === CurrentScheme) ? true : false  /* Middle child gets no spacing */
        log === true && console.log(`\n Relation.middleChild ${Relation.middleChild}`,)
        if (Relation.middleChild) { /* Passed Middle Child Test (last child gets bottom spacing back)  */
            Relation.lastChild = (NextSectionScheme === CurrentScheme) ? false : true // If no next page, then lastChild is true
            log === true && console.log(`\n Relation.lastChild ${Relation.lastChild}`,)
            if (Relation.lastChild) { Relation.middleChild = false }
        }
        return Relation
    }
    function GetMedia() {
        /* GW do this dynamically ASAP
            for (let screen of SettingsJson.Screens){ 
            }
        */
        const isLargeMobile = useMediaQuery('(min-width: 400px)');
        const isSmall = useMediaQuery('(min-width: 640px)');
        const isLarge = useMediaQuery('(min-width: 1024px)');
        const isXLarge = useMediaQuery('(min-width: 1536px)');
        const isHD = useMediaQuery('(min-width: 1900px)');
        let Media = {
            isLargeMobile: isLargeMobile,
            isSmall: isSmall,
            isLarge: isLarge,
            isXLarge: isXLarge,
            isHD: isHD,
        }

        return Media
    }
    function GetSettings() {
        let { isSmall, isLarge, isHD } = Returns.Media
        let Settings = {
            id: id ? `${id}->${name}` : `${name}`,
            innerID: innerID ? `${innerID}->${name}Inner` : `${name}Inner`,
            className: className ? `${name} ${className}` : `${name}`,
            innerClassName: innerClassName ? `${name}Inner ${innerClassName}` : `${name}Inner`,
            ref: ref ? ref : null,
            innerRef: innerRef ? innerRef : null,
            scheme: scheme ? scheme : "unset",
            lowMargin: (isHD) ? Margin.low[0] : (isLarge) ? Margin.low[1] : (isSmall) ? Margin.low[2] : (!isSmall) && Margin.low[3],
            standardMargin: (isHD) ? Margin.standard[0] : (isLarge) ? Margin.standard[1] : (isSmall) ? Margin.standard[2] : (!isSmall) && Margin.standard[3],
            highMargin: (isHD) ? Margin.high[0] : (isLarge) ? Margin.high[1] : (isSmall) ? Margin.high[2] : (!isSmall) && Margin.standard[3],
            lowestPadding: (isHD) ? Padding.lowest[0] : (isLarge) ? Padding.lowest[1] : (isSmall) ? Padding.lowest[2] : (!isSmall) && Padding.lowest[3],
            lowPadding: (isHD) ? Padding.low[0] : (isLarge) ? Padding.low[1] : (isSmall) ? Padding.low[2] : (!isSmall) && Padding.low[3],
            standardPadding: (isHD) ? Padding.standard[0] : (isLarge) ? Padding.standard[1] : (isSmall) ? Padding.standard[2] : (!isSmall) && Padding.standard[3],
            highPadding: (isHD) ? Padding.high[0] : (isLarge) ? Padding.high[1] : (isSmall) ? Padding.high[2] : (!isSmall) && Padding.high[3],
            lowestGap: (isHD) ? Gap.lowest[0] : (isLarge) ? Gap.lowest[1] : (isSmall) ? Gap.lowest[2] : (!isSmall) && Gap.lowest[3],
            lowGap: (isHD) ? Gap.low[0] : (isLarge) ? Gap.low[1] : (isSmall) ? Gap.low[2] : (!isSmall) && Gap.low[3],
            standardGap: (isHD) ? Gap.standard[0] : (isLarge) ? Gap.standard[1] : (isSmall) ? Gap.standard[2] : (!isSmall) && Gap.standard[3],
            highGap: (isHD) ? Gap.high[0] : (isLarge) ? Gap.high[1] : (isSmall) ? Gap.high[2] : (!isSmall) && Gap.high[3],
        }
        Settings.lowMarginX = `${Settings.lowMargin} 0`
        Settings.lowMarginY = `0 ${Settings.lowMargin}`
        Settings.standardMarginX = `${Settings.standardMargin} 0`
        Settings.standardMarginY = `0 ${Settings.standardMargin}`
        Settings.highMarginX = `${Settings.highMargin} 0`
        Settings.highMarginY = `0 ${Settings.highMargin}`
        Settings.lowPaddingX = `${Settings.lowPadding} 0`
        Settings.lowPaddingY = `0 ${Settings.lowPadding}`
        Settings.standardPaddingX = `${Settings.standardPadding} 0`
        Settings.standardPaddingY = `0 ${Settings.standardPadding}`
        Settings.highPaddingX = `${Settings.highPadding} 0`
        Settings.highPaddingY = `0 ${Settings.highPadding}`
        Settings.width = GetWidth()
        let tempStandardMargin = {
            top: Settings.standardMargin,
            right: Settings.standardMargin,
            bottom: Settings.standardMargin,
            left: Settings.standardMargin
        }
        let tempLowMargin = {
            top: Settings.lowMargin,
            right: Settings.lowMargin,
            bottom: Settings.lowMargin,
            left: Settings.lowMargin
        }
        if (Returns.Relation.middleChild) {
            log === true && console.log(`GetSettings if (Relation.middleChild && !Relation.lastChild) {`)
            tempStandardMargin.top = 0
            tempStandardMargin.bottom = 0
            tempLowMargin.top = 0
            tempLowMargin.bottom = 0
        }
        if (Returns.Relation.lastChild) {
            log === true && console.log(`GetSettings if Returns.Relation.lastChild`)
            // tempStandardMargin.top = 0
            //tempStandardMargin.bottom = Settings.standardMargin
            //tempLowMargin.top = 0
            // tempLowMargin.bottom = Settings.standardMargin
        }
        if (Returns.Relation.parentContainer) {/**Parent with fixed Width Causes Left and Right Margin to Act as padding */
            tempStandardMargin.left = 0
            tempStandardMargin.right = 0
            tempLowMargin.left = 0
            tempLowMargin.right = 0
        }
        Settings.standardMarginAll = `${tempStandardMargin.top} ${tempStandardMargin.right} ${tempStandardMargin.bottom} ${tempStandardMargin.left}`
        Settings.lowMarginAll = `${tempLowMargin.top} ${tempLowMargin.right} ${tempLowMargin.bottom} ${tempLowMargin.left}`
        return Settings
    }
    function GetWidth() {
        /**
         * Needs:?
         */
        if (log == true) {
            console.log("----> GetWidth")
        }
        let { isLargeMobile, isSmall, isLarge, isHD } = Returns.Media
        let outerWidth = (isHD) ? Width.isHD : (isLarge) ? Width.isLarge : (isSmall) ? Width.isSmall : (isLargeMobile) ? Width.isLargeMobile : !(isLargeMobile) && Width.isActive
        let desiredWidth = outerWidth
        if (!Returns.Relation?.parentContainer) {
            desiredWidth = outerWidth
        };
        if (Returns.Relation?.parentContainer && Returns.Relation?.parentContainerSize) {
            desiredWidth = parentContainerSize
        };

        return desiredWidth
    }
    function GetStyle(style) {
        let { fgcolor, bgcolor, fgaccent } = Colors(scheme);
        let componentStyle = {
            backgroundColor: style?.backgroundColor ? style?.backgroundColor : bgcolor,
            color: style?.color ? style?.color : fgcolor,
            fgaccent: style?.fgaccent ? style?.fgaccent : fgaccent,
            scheme: scheme ? scheme : "unset"
        };
        let mergedStyle = { ...componentStyle, ...style }
        return mergedStyle;
    }
    function GetTextStyle() { /**Text Element (h1-5, p, ul, li, b, strong, i), Styles, Colors and Font Size and Weight */
        let tag = data?.tag ? data?.tag : 'p'
        let type = data?.type ? data?.type : 'standard'
        let { Media, Style } = Returns
        let FontsStandard = {
            fontSizeh2: (Media.isHD) ? '36px' : (Media.isXLarge) ? '31px' : (Media.isLarge) ? '24px' : (Media.isSmall) ? '21px' : (Media.isLargeMobile) ? '19px' : '19px',
            fontWeighth2: '625',

            fontSizeh3: (Media.isHD) ? '34px' : (Media.isXLarge) ? '29px' : (Media.isLarge) ? '23px' : (Media.isSmall) ? '20px' : (Media.isLargeMobile) ? '18px' : '18px',
            fontWeighth3: '625',

            fontSizeBlockquote: (Media.isHD) ? '36px' : (Media.isXLarge) ? '31px' : (Media.isLarge) ? '24px' : (Media.isSmall) ? '21px' : (Media.isLargeMobile) ? '19px' : '19px',
            fontWeigthBlockquote: '625',

            fontSizeStrong: 'inherit',
            fontWeightStrong: '700',

            fontSizep: (Media.isHD) ? '17px' : (Media.isXLarge) ? '16px' : (Media.isLarge) ? '14px' : (Media.isSmall) ? '14px' : (Media.isLargeMobile) ? '14px' : '14px',
            fontWeightp: '500',

            fontSizeli: (Media.isHD) ? '17px' : (Media.isXLarge) ? '16px' : (Media.isLarge) ? '14px' : (Media.isSmall) ? '14px' : (Media.isLargeMobile) ? '14px' : '14px',
            fontWeightli: '500',
        }
        let FontsSubHeadline = {//FeaturedSubHeadline
            fontSizeh2: (Media.isHD) ? '39px' : (Media.isXLarge) ? '33px' : (Media.isLarge) ? '27px' : (Media.isSmall) ? '25px' : (Media.isLargeMobile) ? '22px' : '22px',
            fontWeighth2: '675',
            // fontSizeh3: (Media.isHD) ? '34px' : (Media.isXLarge) ? '30px' : (Media.isLarge) ? '23px' : (Media.isSmall) ? '21px' : (Media.isLargeMobile) ? '20px' : '20px',
            fontSizeh3: (Media.isHD) ? '19px' : (Media.isXLarge) ? '19px' : (Media.isLarge) ? '18px' : (Media.isSmall) ? '18px' : (Media.isLargeMobile) ? '17px' : '17px',
            fontWeighth3: '675',
            fontSizep: (Media.isHD) ? '24px' : (Media.isXLarge) ? '20px' : (Media.isLarge) ? '18px' : (Media.isSmall) ? '16px' : (Media.isLargeMobile) ? '15px' : '14px',
            fontWeightp: '650',
        }
        let FontsHeadline = {//FeaturedHeadline
            fontSizeh1: (Media.isHD) ? '28px' : (Media.isXLarge) ? '26px' : (Media.isLarge) ? '22px' : (Media.isSmall) ? '22px' : (Media.isLargeMobile) ? '20px' : '20px',
            fontWeighth1: '625',
            fontSizeh2: (Media.isHD) ? '28px' : (Media.isXLarge) ? '26px' : (Media.isLarge) ? '22px' : (Media.isSmall) ? '22px' : (Media.isLargeMobile) ? '20px' : '20px',
            fontWeighth2: '625'
        }
        let FontsSubText = {
            fontSizep: (Media.isHD) ? '18px' : (Media.isXLarge) ? '16px' : (Media.isLarge) ? '15px' : (Media.isSmall) ? '15px' : (Media.isLargeMobile) ? '14px' : '13px',
            fontWeightp: '500'
        }
        let { fontSizeh1, fontWeighth1, fontSizeh2, fontWeighth2, fontSizeh3, fontWeighth3, fontSizeBlockquote, fontWeigthBlockquote, fontSizeStrong, fontWeightStrong, fontSizep, fontWeightp, fontSizeli, fontWeightli } = (type === 'headline') ? FontsHeadline : (type === 'subHeadline') ? FontsSubHeadline : (type === 'subText') ? FontsSubText : FontsStandard
        let TextStyle = {
            fontSize: (tag === "h1") ? fontSizeh1 : (tag === "h2") ? fontSizeh2 : (tag === "h3") ? fontSizeh3 : (tag === "p") ? fontSizep : (tag === "li") ? fontSizeli : (tag === "blockquote") ? fontSizeBlockquote : (tag === "strong") ? fontSizeStrong : fontSizep,
            fontWeight: (tag === "h1") ? fontWeighth1 : (tag === "h2") ? fontWeighth2 : (tag === "h3") ? fontWeighth3 : (tag === "p") ? fontWeightp : (tag === "li") ? fontWeightli : (tag === "blockquote") ? fontWeigthBlockquote : (tag === "strong") ? fontWeightStrong : fontWeightp,
            color: (type === 'headline' && Returns.Settings.id.includes('TextBlock')) ? '#002c77' : Style.color,
            lineHeight: '120%',
            ...textStyle,//passed in override.
        }
        if ((type === 'headline') || (type === 'subHeadline')) {
            let numericFont = TextStyle?.fontSize?.replace("px", "")
            //TextStyle.marginTop = `-${numericFont * .33}px`
        }
        if ((data?.href) || (data?.tag === 'a')) {

            if (type === 'subHeadline') {
                TextStyle.color = engaged ? Style.fgaccent : Style.color
            }
            if (type === 'standard') {
                TextStyle.color = Style.fgaccent
                TextStyle.textDecoration = engaged ? `underline ${Style.fgaccent}` : null
            }
            if (type === 'headline') {
                if (scheme === 'quaternary') {
                    TextStyle.textDecoration = engaged ? `underline ${Style.fgaccent}` : null
                }

            }
        }
        if (data?.tag === 'ul') { /**GW Move to props, not text style arguably */
            //TextStyle.listStylePosition = 'inside'
            TextStyle.display = 'grid',
                TextStyle.gap = Returns.Settings.lowGap
            TextStyle.margin = `0 0 0 13px`
        }
        if (data?.tag === 'li') { /**GW Move to props, not text style arguably */
            TextStyle.listStyle = (data?.svg == 'download') ? `url(/images/download.webp)` : (data?.svg == 'external') ? `url(/images/icon-retweet3.png)` : (data?.tag == "li") ? `url(/images/list-bullet.gif)` : null
            //TextStyle.listStylePosition = 'inside'
        }
        if (data?.small) {
            let numericFont = TextStyle.fontSize.replace("px", "")
            numericFont = numericFont * .75
            TextStyle.fontSize = `${numericFont}px`
        }
        if (data?.large) {
            let numericFont = TextStyle.fontSize.replace("px", "")
            numericFont = numericFont * 1.25
            TextStyle.fontSize = `${numericFont}px`
        }
        let mergedStyle = { ...TextStyle, ...style }
        return mergedStyle;
    }
    function GetLinkStyle() {/**Link Element (a), Event & Engagement + Styles, Colors and Font Size and Weight */
        let type = data?.type ? data?.type : 'standard'
        let { Style } = Returns
        let textDecorationScheme = (scheme == "primary")
            ? Appearance.LinkStyle.Primary.textDecoration :
            (scheme === "secondary")
                ? Appearance.LinkStyle.Secondary.textDecoration
                : (scheme === "tertiary")
                    ? Appearance.LinkStyle.Tertiary.textDecoration
                    : (scheme === "quaternary")
                        ? Appearance.LinkStyle.Quaternary.textDecoration
                        : (scheme === "senary")
                            ? Appearance.LinkStyle.Senary.textDecoration
                            : "inherit"
        let textUnderlineOffsetScheme = (scheme == "primary")
            ? Appearance.LinkStyle.Primary.textUnderlineOffset :
            (scheme === "secondary")
                ? Appearance.LinkStyle.Secondary.textUnderlineOffset
                : (scheme === "tertiary")
                    ? Appearance.LinkStyle.Tertiary.textUnderlineOffset
                    : (scheme === "quaternary")
                        ? Appearance.LinkStyle.Quaternary.textUnderlineOffset
                        : (scheme === "senary")
                            ? Appearance.LinkStyle.Senary.textUnderlineOffset
                            : "inherit"
        let linkStyleStandard = {/* GW do this dynamically ASAP*/
            //outline: (engaged) ? `2px solid ${Style.fgaccent}` : 'unset',
            //outlineOffset: '3px',
            // borderRadius: '4px',
            color: Style.fgaccent,//Needed in case only a tag no tag. li currenlty in Textblock
            //borderBottom: (engaged) ? `1px solid ${Style.fgaccent}` : 'unset', //Now Handled in Text Style

        };
        let linkStyleSubHeadline = {/* GW do this dynamically ASAP*/
            //outline: (engaged) ? `2px solid ${Style.fgaccent}` : 'unset',
            //outlineOffset: '3px',
            // borderRadius: '4px',
            color: Style.fgaccent, /* GW Relies on TextSyle also where should it go? */
            textDecoration: textDecorationScheme,
            textUnderlineOffset: textUnderlineOffsetScheme


        };
        let LinkStyle = (type === 'subHeadline') ? linkStyleSubHeadline : linkStyleStandard
        let mergedStyle = { ...LinkStyle, ...linkStyle }
        return mergedStyle
    }
    function GetElementProps() {/**Get Element props for a passed Element */
        let { Settings, LinkStyle } = Returns
        if (element === 'a' || data.href) {/**For link onMouseEnter, OnMouseLeave, onClick, engaged, style variations */
            let Props = {/** GW Some is also handled by GetTextStyle (but only on wrapper component genreated here and tag inner there consider revision) */
                engaged: `${engaged}`,
                onMouseEnter: handleEngaged,
                onMouseLeave: handleEngaged,
                onClick: onClick ? onClick : null,
                style: LinkStyle,
                href: data.href,
                id: Settings.id
            }
            return Props
        }
    }
}
/**
 *
 * Conceptualize
 *
 let StandardContainer = GetElement( /**Tried this but struggled to render the element
    {
    className:  Settings.className ,
    innerClassName:"StandardContainerInnerLowMargin",
    style:SiteFooterStyle ,
    innerStyle: FooterInnerStyle,
    id:Settings.id ,
    innerID: Settings.innerID
    }
    ,"StandardContainer"
  )
 *
 */
//Consider, in Gridblocks here we have to use, parentContainer={true}  middleChild={true} in order to nix side margin and top margin, it's really a grandchild