'use client'
import "./StandardContainer.css";
import { GetSettings } from "@/lib/GetSettings.js";
let log = true
export function StandardContainer(props) {
  /**
   * About Me: 
   * - React container component Designed by Greggory Wiley, Technologic Digital Services
   * - 
   *
   * Todo List:
   * - No Double Margin on stacked containers (Difficult)
   * 
   * Logging:
   * -(copy out if needed) console.log("settings", Settings, "Style", Style, "InnerStyle", InnerStyle);
   * 
   * Usage Examples:
   * - import { StandardContainer } from "@/components/containers/StandardContainer/StandardContainer";
   * - <StandardContainer scheme={Settings.scheme} className="name" innerClassName="StandardContainerInnerNoMargin || StandardContainerInnerMargin"  style={style} innerStyle={style} id="id"  innerID={innerID} ref={OuterRef}  innerRef={InnerRef}>
   * -- Specify one of the inner class names indicated above with the or symbol (||) to set the inner container's margin.
 */
  let { Settings, Style, InnerStyle, Relation } = GetSettings(props, "StandardContainer");
  let StandardContainerStyle = {
    display: 'grid',
    //placeContent: 'center',
    placeItems: 'center',
    position: 'relative',
    width: '100%',
    ...Style
  }
  let innerMargin = (Settings?.innerClassName?.includes('StandardContainerInnerNoMargin')) ? '0 0 0 0' : (Settings?.innerClassName?.includes('StandardContainerInnerLowMargin')) ? Settings?.lowMarginAll : Settings?.standardMarginAll
  let StandardContainerInnerStyle = {
    display: 'grid',
    placeContent: 'start',
    placeItems: 'start',
    width: Settings.width,
    //margin: innerMargin,
    gap: Settings?.standardGap,
    ...InnerStyle
  }
  return (
    <div style={StandardContainerStyle} id={Settings.id} ref={Settings?.ref} scheme={Settings.scheme} middle-child={`${Relation.middleChild}`}
      last-child={`${Relation.lastChild}`} parent-container={`${Relation.parentContainer}`} parent-container-size={`${Relation.parentContainerSize}`}>
      <div style={StandardContainerInnerStyle} id={Settings.innerID} ref={Settings?.innerRef} className={props.innerClassName}>
        {/* <div style={StandardContainerInnerStyle} id={Settings.innerID} ref={Settings?.innerRef} className='ring-2 ring-blue-500/50'></div> */}
        {props.children}
      </div>
    </div>
  );
}

