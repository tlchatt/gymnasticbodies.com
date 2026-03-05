import './FeaturedItem.css'
import { GetSettings } from "@/lib/GetSettings.js";
import { useState } from 'react';
export function FeaturedItemContent(props) {
  let { Settings, Style, InnerStyle } = GetSettings(props, "FeaturedItemContent");
  let FeaturedItemContentStyle = {
    display: 'grid',
    placeItems: 'start',
    width: '100%',
  }

  FeaturedItemContentStyle = { ...Style, ...FeaturedItemContentStyle }
  return (
    <div className={Settings.className} style={FeaturedItemContentStyle}>
      <div className={Settings.innerClassName} style={InnerStyle} id={`${Settings.id}Inner`}>
        {props.children}
      </div>
    </div>
  );
}
export function FeaturedHeadline(props) {
  let { Settings, Style, Media } = GetSettings(props, "FeaturedHeadline");
  //console.log(`FeaturedHeadline(props)`, props)
  let Fonts = getFontSettings()
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    setEngaged(!engaged)
  }

  let featuredHeadlineStyle = {
    display: 'grid',
    justifySelf: 'start',
    alignSelf: 'center',
    ...Style,
  }
  let linkStyle = {
    ...featuredHeadlineStyle,
    color: engaged ? Style.color : Style.color,
  }
  let tagStyle = {
    ...Style,
    fontSize: Fonts.fontSize,
    fontWeight: Fonts.fontWeight,
    lineHeight: '120%',
    outline: Settings.scheme == "primary" ? 'unset' : engaged ? `2px solid ${Style.color}` : "unset",
    outlineOffset: Settings.scheme == "primary" ? 'unset' : engaged ? `2px` : 'unset',
    color: engaged ? Style.fgaccent : Style.color,
    width: "100%",
    display: "inline",
    justifySelf: "start",
    alignSelf: "center",
    padding: "0",
    marginTop: Fonts.lineHeightCancel,

  }
  props.data.tag = props.data.tag ? props.data.tag : 'h2'
  return (
    <>
      {props.data.href &&
        <a href={props.data.href} className={Settings.className} style={linkStyle} id={Settings.id}
          onClick={e => handleEngage(e)}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}
        >
          <props.data.tag style={tagStyle} id="FeaturedHeadlineTag">
            {props.data?.text || "FeaturedHeadline"}
          </props.data.tag>
        </a>
      }
      {!props.data.href &&
        <div className={Settings.className} style={featuredHeadlineStyle} id={Settings.id}>
          <props.data.tag style={tagStyle}>
            {props.data?.text || "FeaturedHeadline"}
          </props.data.tag>
          {props.data.hr &&
            <FeaturedHR scheme={Settings.scheme} />
          }
        </div >
      }
    </>
  )
  function getFontSettings() {
    let tag = props.data.tag ? props.data.tag : 'h2'
    let fontSizeh1 = (Media.isHD) ? '28px' : (Media.isXLarge) ? '26px' : (Media.isLarge) ? '22px' : (Media.isSmall) ? '22px' : (Media.isLargeMobile) ? '20px' : '20px'
    let fontWeighth1 = '650'

    let fontSizeh2 = (Media.isHD) ? '55px' : (Media.isXLarge) ? '40px' : (Media.isLarge) ? '33px' : (Media.isSmall) ? '29px' : (Media.isLargeMobile) ? '24px' : '24px'
    let fontWeighth2 = '675'

    let Fonts = {
      fontSize: (tag === "h1") ? fontSizeh1 : fontSizeh2,
      fontWeight: (tag === "h1") ? fontWeighth1 : fontWeighth2,
    }

    let numericFont = Fonts.fontSize.replace("px", "")
    Fonts.lineHeightCancel = `-${numericFont * .33}px`
    if (props.data.small) {
      Fonts.fontSize = `${numericFont * .75}px`
    }
    if (props.data.large) {
      let numericFont = Fonts.fontSize.replace("px", "")
      Fonts.fontSize = `${numericFont * 1.5}px`
    }
    return Fonts
  }
}
export function FeaturedSubHeadline(props) {
  let { Settings, Style, Media } = GetSettings(props, "FeaturedSubHeadline");
  let tag = props.data.tag ? props.data.tag : 'h3'
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    setEngaged(!engaged)
  }
  let featuredSubHeadlineStyle = {
    display: 'grid',
    justifySelf: 'start',
    alignSelf: 'center',
    ...Style
  }
  let linkStyle = {
    ...featuredSubHeadlineStyle,
    color: props.data.href ? Style.fgaccent : Style.color,
    borderRadius: '4px',
    outline: engaged ? `2px solid ${Style.fgaccent}` : 'unset',
    outlineOffset: engaged ? `2px` : 'unset',
    textDecoration: (Settings.scheme === 'secondary') ? 'underline' : (Settings.scheme === 'quaternary') ? 'underline' : 'unset',
    textUnderlineOffset: (Settings.scheme === 'secondary') ? '.25em' : (Settings.scheme === 'quaternary') ? '.25em' : 'unset'
  }
  let fontSizeh2 = (Media.isHD) ? '39px' : (Media.isXLarge) ? '33px' : (Media.isLarge) ? '27px' : (Media.isSmall) ? '25px' : (Media.isLargeMobile) ? '22px' : '22px'
  let fontWeighth2 = '675'
  let fontSizeh3 = (Media.isHD) ? '39px' : (Media.isXLarge) ? '33px' : (Media.isLarge) ? '27px' : (Media.isSmall) ? '25px' : (Media.isLargeMobile) ? '22px' : '22px'
  let fontWeighth3 = '675'
  let fontSizep = (Media.isHD) ? '24px' : (Media.isXLarge) ? '20px' : (Media.isLarge) ? '18px' : (Media.isSmall) ? '16px' : (Media.isLargeMobile) ? '15px' : '14px'
  let fontWeightp = '650'

  let tagStyle = {
    ...Style,
    outline: Settings.scheme == "primary" ? 'unset' : engaged ? `2px solid ${Style.color}` : "unset",
    outlineOffset: Settings.scheme == "primary" ? 'unset' : engaged ? `2px` : 'unset',
    // color: engaged ? Style.fgaccent : Style.color,
    display: "inline",
    justifySelf: "start",
    alignSelf: "center",
    margin: "0",
    padding: "0",
    fontSize: (tag === "h2") ? fontSizeh2 : (tag === "h3") ? fontSizeh3 : (tag === "p") ? fontSizep : fontSizeh3,
    fontWeight: (tag === "h2") ? fontWeighth2 : (tag === "h3") ? fontWeighth3 : (tag === "p") ? fontWeightp : fontWeighth3,
    lineHeight: '150%',
  }
  tagStyle = { ...Style, ...tagStyle }
  return (
    <>
      {props.data.href &&
        <a href={props.data.href} className={Settings.className} id={Settings.id} style={linkStyle}
          onClick={e => handleEngage(e)}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}>
          <props.data.tag style={tagStyle} >
            {props.data?.text || "FeaturedSubHeadline"}
          </props.data.tag>
          {props?.children &&
            props.children
          }
        </a>
      }
      {!props.data.href &&
        <div className={Settings.className} style={Style} id={Settings.id}>
          <props.data.tag style={tagStyle} >
            {props.data?.text || "FeaturedSubHeadline"}
          </props.data.tag>
          {props.data.hr &&
            <FeaturedHR scheme={Settings.scheme} />
          }
          {props?.children &&
            props.children
          }
        </div >
      }

    </>
  );
}
export function FeaturedText(props) {
  /** Example Usage:
    <FeaturedSubHeadline scheme={Settings.scheme} data={{ text: "We seek the best and brightest staff and challenge them to go beyond — <i>redefining possible®</i>", tag: "p", href: "/careers/", hr: false }} />
 */
  let { Settings, Style, Media } = GetSettings(props, "FeaturedText");
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    // console.log("Engaged:", e.type, engaged, "Event Target tagName:", e.target.tagName);
    setEngaged(!engaged)
  }
  function OnClick(e) {
    // e.preventDefault()
    if (props.onClick) {
      console.log("OnClick in FeaturedText")
      props.onClick(e)
      return
    }

    else { return handleEngage() }
  }
  let fontSizep = (Media.isHD) ? '18px' : (Media.isXLarge) ? '16px' : (Media.isLarge) ? '15px' : (Media.isSmall) ? '15px' : (Media.isLargeMobile) ? '14px' : '13px'

  let FeaturedTextStyle = {
    display: 'grid',
    justifySelf: 'start',
    alignSelf: 'center',
    ...Style
  }
  let linkStyle = {
    ...FeaturedTextStyle,
    color: engaged ? Style.color : Style.color,
    ...Style,
  }
  let tagStyle = {
    outline: engaged ? `2px solid ${Style.color}` : 'unset',
    outlineOffset: engaged ? `2px` : 'unset',
    borderRadius: engaged ? `4px` : 'unset',
    color: engaged ? Style.color : Style.color,
    fontSize: fontSizep,
    fontWeight: '500',
    lineHeight: '120%',
    ...Style,
  }

  props.data.tag = props.data.tag ? props.data.tag : 'p'

  return (
    <>
      {props.data.href &&
        <a href={props.data.href} onClick={OnClick} className={`${Settings.className} FeaturedTextLink`} id={Settings.id} style={linkStyle}

          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}>
          < props.data.tag style={tagStyle}>
            {props.data?.text || "FeaturedText No Text"}
          </props.data.tag>
        </a>
      }
      {!props.data.href &&
        <div className={Settings.className} onClick={OnClick} style={FeaturedTextStyle} id={Settings.id}>
          < props.data.tag style={tagStyle}>
            {props.data?.text || "FeaturedText No Text"}
          </props.data.tag>
          {props.data.hr &&
            <FeaturedHR scheme={Settings.scheme} />
          }
        </div >
      }

    </>
  );
}
export function FeaturedButton(props) {
  let { Settings, Style } = GetSettings(props, "FeaturedButton");
  // console.log("FeaturedButton settings", Settings, "Style", Style);
  /** Example Usage:
     <FeaturedButton scheme={Settings.scheme} data={{ text: "Careers at SRC", href: "/careers/",svg:true, ariaLabel:"Visit our news and events page"}} />
  */
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    //console.log("Engaged:", e.type, engaged, "Event Target tagName:", e.target.tagName);
    setEngaged(!engaged)
  }
  function OnClick(e) {

    if (props.onClick) {
      props.onClick()
      return
    }
    else { return handleEngage() }
  }
  let linkStyle = {
    display: "grid",
    justifyItems: "start",
    width: "fit-content",
    ...Style,
  }

  let buttonStyle = {
    backgroundColor: props.data.transparent ? Style.backgroundColor : engaged ? Style.color : Style.backgroundColor,
    color: engaged ? Style.fgaccent : Style.color,
    borderColor: Style.fgaccent,
    outline: engaged ? `3px solid ${Style.color}` : 'unset'
  }
  let buttonSVGStyle = {
    color: engaged ? Style.fgaccent : Style.color
  }

  return (
    <>
      {props.data.href &&
        <a href={props.data.href}
          style={linkStyle} id={Settings.id}
          aria-label={props.data.ariaLabel || `Click for ${props.data?.text}`}
          onClick={OnClick}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}
        >
          <button style={buttonStyle} className={Settings.className}>
            {props.data?.text || "FeaturedButton"}
            {props.data?.svg &&
              <svg xmlns="http://www.w3.org/2000/svg" style={buttonSVGStyle} className="FeaturedSecondButtonSVG" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
              </svg>
            }
          </button>
        </a>
      }
      {!props.data.href &&
        <div
          style={linkStyle} id={Settings.id}
          aria-label={props.data.ariaLabel || `Click for ${props.data?.text}`}
          onClick={OnClick}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}
        >
          <button style={buttonStyle} className={Settings.className}>
            {props.data?.text || "FeaturedButton"}
            {props.data?.svg &&
              <svg xmlns="http://www.w3.org/2000/svg" style={buttonSVGStyle} className="FeaturedSecondButtonSVG" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
              </svg>
            }
          </button>
        </div>
      }
    </>


  );
}
export function SmallFeaturedButton(props) {
  let { Settings, Style, Media } = GetSettings(props, "SmallFeaturedButton");
  // console.log("FeaturedButton settings", Settings, "Style", Style);
  /** Example Usage:
     <FeaturedButton scheme={Settings.scheme} data={{ text: "Careers at SRC", href: "/careers/",svg:true, ariaLabel:"Visit our news and events page"}} />
  */
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    //console.log("Engaged:", e.type, engaged, "Event Target tagName:", e.target.tagName);
    setEngaged(!engaged)
  }
  function OnClick(e) {
    e.preventDefault();
    if (props.onClick) {
      props.onClick(e)
      return
    }
    else { return handleEngage() }
  }
  let buttonStyle = {
    backgroundColor: props.data.transparent ? Style.backgroundColor : engaged ? Style.color : Style.backgroundColor,
    color: engaged ? Style.fgaccent : Style.color,
    borderColor: engaged ? Style.fgaccent : Style.color,
    outline: engaged ? `3px solid ${Style.color}` : 'unset',
    borderStyle: 'solid',
    borderWidth: '3px',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: (Media.isHD) ? '24px' : (Media.isXLarge) ? '22px' : (Media.isLarge) ? '20px' : (Media.isSmall) ? '16px' : '15px',
    padding: (Media.isHD) ? '15px 30px' : (Media.isXLarge) ? '13px 25px' : (Media.isLarge) ? '11px 22px' : (Media.isSmall) ? '9px 14px' : '7px 12px',
    lineHeight: '150%',
    display: 'grid',
    gridAutoFlow: 'column',
    placeItems: 'center',
    placeContent: 'center',
    gridGap: '9px',
  }
  let buttonSVGStyle = {
    color: engaged ? Style.fgaccent : Style.color
  }
  let linkStyle = {
    ...Style,
    display: "grid",
    justifyItems: "start",
    width: "fit-content",
    fontWeight: '625',
  }

  return (
    <>
      {props.data.href &&
        <a href={props.data.href}
          style={linkStyle} id={Settings.id}
          aria-label={props.data.ariaLabel || `Click for ${props.data?.text}`}
          onClick={OnClick}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}
        >
          <button style={buttonStyle} className={Settings.className}>
            {props.data?.text || "FeaturedButton"}
            {props.data?.svg &&
              <svg xmlns="http://www.w3.org/2000/svg" style={buttonSVGStyle} className="FeaturedSecondButtonSVG" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
              </svg>
            }
          </button>
        </a>
      }
      {!props.data.href &&
        <div
          style={linkStyle} id={Settings.id}
          aria-label={props.data.ariaLabel || `Click for ${props.data?.text}`}
          onClick={OnClick}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}
        >
          <button style={buttonStyle} className={Settings.className}>
            {props.data?.text || "FeaturedButton"}
            {props.data?.svg &&
              <svg xmlns="http://www.w3.org/2000/svg" style={buttonSVGStyle} className="FeaturedSecondButtonSVG" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
              </svg>
            }
          </button>
        </div>
      }
    </>


  );
}
export function FeaturedSubHeadlineButton(props) {
  let { Settings, Style } = GetSettings(props, "FeaturedSubHeadlineButton");
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    // console.log("Engaged:", e.type, engaged, "Event Target tagName:", e.target.tagName);
    setEngaged(!engaged)
  }
  let buttonStyle = {
    backgroundColor: props.data.transparent ? Style.backgroundColor : engaged ? Style.color : Style.backgroundColor,
    color: engaged ? Style.fgaccent : Style.color,
    border: engaged ? `1px solid ${Style.fgaccent}` : `1px solid ${Style.color}`,
    // borderColor: engaged ? Style.fgaccent : Style.color,
    outline: engaged ? `1px solid ${Style.color}` : 'unset',
    outlineOffset: engaged ? '2px' : 'unset'
  }
  let linkStyle = {
    ...Style, display: "grid",
    justifyItems: "start",
    width: "fit-content",
  }
  return (

    <a href={props.data.href}
      className={Settings.className}
      id={Settings.id}
      style={linkStyle}
      aria-label={props.data.ariaLabel || `Click for ${props.data?.text}`}
      onClick={e => handleEngage(e)}
      onMouseEnter={e => handleEngage(e)}
      onMouseLeave={e => handleEngage(e)}
    >
      <button style={buttonStyle} className={Settings.className}>
        {props.data?.text || "FeaturedSubHeadlineButton"}
        {props.data?.svg &&
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
          </svg>
        }
      </button>
    </a>

  );
}
export function FeaturedTextButton(props) {
  let { Settings, Style } = GetSettings(props, "FeaturedTextButton");
  const [engaged, setEngaged] = useState(false)
  const handleEngage = (e) => {
    setEngaged(!engaged)
  }
  let buttonStyle = {
    ...Style,
    backgroundColor: props.data.transparent ? Style.backgroundColor : engaged ? Style.color : Style.backgroundColor,
    color: engaged ? Style.fgaccent : Style.color,
    border: engaged ? `1px solid ${Style.fgaccent}` : `1px solid ${Style.color}`,
    borderRadius: '3px',
    outline: engaged ? `1px solid ${Style.color}` : 'unset',
    outlineOffset: engaged ? '2px' : 'unset'
  }
  return (
    <>
      {props.data.href &&
        <a href={props.data.href}
          className={Settings.className}
          style={Style} id={Settings.id}
          aria-label={props.data.ariaLabel || `Click for ${props.data?.text}`}
          onClick={e => handleEngage(e)}
          onMouseEnter={e => handleEngage(e)}
          onMouseLeave={e => handleEngage(e)}
        >
          <button style={buttonStyle} >
            {props.data?.text || "FeaturedButton"}
            {props.data?.svg &&
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
              </svg>
            }
          </button>
        </a>
      }

      {!props.data.href &&
        <div className={Settings.className} id={Settings.id}>
          <button style={buttonStyle} onClick={e => handleEngage(e)}
            onMouseEnter={e => handleEngage(e)}
            onMouseLeave={e => handleEngage(e)} >
            {props.data?.text || "FeaturedButton"}
            {props.data?.svg &&
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
              </svg>
            }
          </button>
        </div>
      }

    </>
  );
}
export function FeaturedHR(props) {
  let { Settings, Style } = GetSettings(props, "FeaturedHR");
  let hrStyle = {
    borderBottom: Style?.color ? `1px solid ${Style.fgaccent}` : "`1px solid #FFFFFF",
    width: '100%',
    ...Style
  }
  return (
    <div className={Settings.className} style={hrStyle} id={Settings.id} />
  )
}