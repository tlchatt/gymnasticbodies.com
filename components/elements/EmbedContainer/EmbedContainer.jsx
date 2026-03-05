import "./EmbedContainer.css";
import { GetSettings } from "@/lib/GetSettings.js";
import { StandardContainer } from "@/components/containers/StandardContainer/StandardContainer";
let log = false
export function EmbedContainer(props) {
  if (props?.data?.extractedData?.length >= 1) {
    return (<EmbedContainerGroupWrapper {...props} />)
  }
  let { Settings, Style, Media, Relation } = GetSettings(props, "EmbedContainer");
  log === true && console.log('EmbedContainer', Settings.width)
  let { title, src } = getCrawlContent()
  let { isLarge } = Media
  let iFrameStyle = {
    ...Style,
    width: Relation.parentContainer ? Settings.width : `calc(${Settings.width} * 3 / 4)`,
    height: isLarge ? `calc(${Settings.width} * 3 / 4 * 3 / 4)` : `calc(${Settings.width} * 3 / 4 * 3 / 4)`,
    border: "none"
  }
  let ContainerInnerStyle = {
    placeContent: "center",
    ...Style
  }
  return (
    <StandardContainer scheme={Settings.scheme} className={Settings.className} style={Style} innerStyle={ContainerInnerStyle} innerClassName="StandardContainerInnerNoMargin" id={Settings.id} {...props}>
      <iframe style={iFrameStyle} src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen title={title} />
      {props.children}
    </StandardContainer>
  );
  function getCrawlContent() {
    
    let data = props?.data
    log === true && console.log("children:", props?.data)
      log === true && console.log("props in getCrawlContent:", data)
    let src = data.tagName === "IFRAME" ? data.attributes.src : null
    let title = data.tagName === "IFRAME" ? data.attributes.title : ""
    // let src = data.filter(item => item.tagName === "IFRAME")[0]?.attributes.src
      log === true && console.log("src is:",src)
    // let title = data.filter(item => item.tagName === "IFRAME")[0]?.attributes.title
      log === true &&  console.log("title is:",title)
    let returnObj = {
      title: title,
      src: src
    }

    return returnObj
  }
  function EmbedContainerGroupWrapper(props) {
    return (
      <>
        {props.data.extractedData?.map((item, index) => (
          < EmbedContainer
            {...props}
            data={item}
            key={index}
          />
        ))}
      </>
    )
  }
}