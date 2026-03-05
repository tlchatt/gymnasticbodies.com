import "./TextBlock.css";
import { GetSettings } from "@/lib/GetSettings.js";
import { PortableText } from '@portabletext/react'
import { StandardContainer } from "../StandardContainer/StandardContainer";

import { GetElement } from "@/lib/GetElement"
export function TextBlock(props) {
  let log = true
  log === true && console.log('\n\n\nTextBlock props', props)
  let { Settings, Style, Relation, Media, TextStyle } = GetSettings(props, "TextBlock");
  handleCrawlContent(props.data) // adjsut types.
  let data = filterContent(props?.data?.extractedData ? props?.data?.extractedData : props.data) //Clean up blank tags
  log === true && console.log('TextBlock post filterContent data', data)
  let groups = getContentGroups(data)
  log === true && console.log('TextBlock post filterContent groups')
  if (log === true) {
    for (let group of groups) {
      console.log(group, 'group')
      for (let item of group) {
        console.log('item.children', item?.children ? item?.children : item?.src)
      }
    }
  }

  const components = {
    block: {
      h1: ({ children, value }) => {
        let incomingStyle = { ...value.Style }
        let cleanChildren = children.filter(filterChildren2)
        if (cleanChildren.length === 0) { return null }
        return (
          <GetElement scheme={Settings.scheme} data={{ text: cleanChildren, tag: "h1", type: "headline" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      h2: ({ children, value }) => {
        let incomingStyle = { ...value.Style }
        let cleanChildren = children.filter(filterChildren2)
        if (cleanChildren.length === 0) { return null }
        return (
          <GetElement scheme={Settings.scheme} data={{ text: cleanChildren, tag: "h2", type: "headline" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      h3: ({ children, value }) => {
        let incomingStyle = { ...value.Style }
        log === true && console.log('h3', children)
        let cleanChildren = children.filter(filterChildren2)
        if (cleanChildren.length === 0) { return null }
        return (
          <GetElement scheme={Settings.scheme} data={{ text: cleanChildren, tag: "h3", type: "subHeadline" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      h4: ({ children, value }) => {
        let incomingStyle = { ...value.Style }
        let cleanChildren = children.filter(filterChildren2)
        if (cleanChildren.length === 0) { return null }
        return (
          <GetElement scheme={Settings.scheme} data={{ text: cleanChildren, tag: "h4", type: "subHeadline" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      h5: ({ children, value }) => {
        let incomingStyle = { ...value.Style }
        let cleanChildren = children.filter(filterChildren2)
        if (cleanChildren.length === 0) { return null }
        return (
          <GetElement scheme={Settings.scheme} data={{ text: cleanChildren, tag: "h5", type: "subHeadline" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      normal: ({ children, value }) => {
        log = false
        let incomingStyle = { ...value.Style }
        log === true && console.log('normal children', children)
        log === true && console.log('normal value', value)
        log === true && console.log('normal incomingStyle', incomingStyle)
        let TextStyle = {
          Style,
          lineHeight: '135%',
          ...incomingStyle,
        }
        if (value.first === true) {
          TextStyle.paddingTop = null
        }
        let cleanChildren = children.filter(filterChildren2)
        if (cleanChildren.length === 0) { return null }
        return (
          <GetElement scheme={Settings.scheme} style={TextStyle} data={{ text: cleanChildren, tag: "p" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      blockquote: ({ children, value }) => {
        //console.log('blockquote', children)
        return (
          <GetElement scheme={Settings.scheme} style={Style} data={{ text: children, tag: "blockquote" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      headline: ({ children, value }) => {
        //console.log('headline value', value)
        return (
          <GetElement scheme={Settings.scheme} style={Style} data={{ text: children, tag: "h3", type: "subHeadline" }} id={Settings.id} innerID={Settings.innerID} log={false} />
        )
      },
      carouselItem: ({ children }) => {
        console.warn('carouselItem protable text block type unhandles on this page !!!')
        return null
      },
    },
    list: {
      bullet: ({ children }) => {
        return (
          <GetElement scheme={Settings.scheme} style={Style} data={{ text: children, tag: "ul" }} id={Settings.id} innerID={Settings.innerID} />
        )

      },
      number: ({ children }) => {
        return (<GetElement scheme={Settings.scheme} style={Style} data={{ text: children, tag: "ol" }} id={Settings.id} innerID={Settings.innerID} />)
      }
    },
    listItem: {
      bullet: ({ children, value }) => {
        let svgType

        children.map((child) => {
          //href present but doesn't start with / --> myString.charAt(0), which would mean its not internal 
          if (child?.props?.value?.href) {
            if (child?.props?.value?.href?.includes('http:') || child?.props?.value?.href?.includes('https:')) {
              if (!child?.props?.value?.href?.includes('srcinc.com')) {
                svgType = 'external'
              }

            }
            if (child?.props?.value?.href.includes('.pdf')) {
              svgType = 'download'
            }
          }
        })
        let incomingStyle = { ...value.Style }

        return (
          <GetElement scheme={Settings.scheme} style={incomingStyle} data={{ text: children, tag: 'li', svg: svgType }} id={Settings.id} innerID={Settings.innerID} />)
      },
      number: ({ children, value }) => {
        let svgType
        children.map((child) => {
          //href present but doesn't start with / --> myString.charAt(0), which would mean its not internal 
          if (child?.props?.href || child?.props?.value?.href) {
            if (child?.props?.value?.href?.charAt(0) != '/' && !(child?.props?.value?.href.includes('srcinc.com'))) {
              svgType = 'external'
            }
            if (child?.props?.value?.href.includes('.pdf')) {
              svgType = 'download'
            }
          }
        })
        let incomingStyle = { ...value.Style }
        return (
          <GetElement scheme={Settings.scheme} style={incomingStyle} data={{ text: children, tag: 'li', svg: svgType }} id={Settings.id} innerID={Settings.innerID} />)
      },
    },
    marks: {
      link: ({ value, children }) => {// Children here are often arrays.
        return (<GetElement scheme={Settings.scheme} style={Style} data={{ text: children, tag: "a", href: value?.href }} id={Settings.id} innerID={Settings.innerID} value={value} children={children} />
        )
      },
      strong: ({ value, children }) => {// Children here are often arrays.
        return (<GetElement scheme={Settings.scheme} style={Style} data={{ text: children, tag: "strong", href: value?.href }} id={Settings.id} innerID={Settings.innerID} value={value} children={children} />
        )
      }
    },
    types: {
      img: ({ value }) => {
        let incomingStyle = { ...value.Style }
        let NewStyle = {
          maxWidth: Relation.parentContainer ? `100%` : `calc(${Settings.width} * 1 / 5)`,
          //minWidth: '50%',
          placeSelf: 'center',
          ...incomingStyle,
        }
        //console.log('NewStyle', NewStyle)
        if (!value?.src?.[0]) { console.warn('textBlock components img no value', value.src) }
        if (value?.src?.[0] != '/') {
          value.src = `/${value.src}`
        }
        if (value?.src?.includes('audio-description')) {
          return null
        }
        if (value?.src?.includes('icon_open')) {
          return null
        }
        if (value?.alt == 'PDF' || value?.alt == "Enlarge") {//to not display pdf or enlarge image.
          return null
        }
        if (value?.alt == 'On-the-Move Logo Icon') {//later work it to be in size of the text as part of the txt and not a big image.
          return null
        }
        return (<img src={value.src} alt={value.alt} style={NewStyle} width={value.width} height={value.height} />)
      },
      slide: ({ value }) => {
        let imageStyle = {
          style: value.style
        }
        let NewStyle = {
          placeSelf: 'start',
          maxWidth: Relation.parentContainer ? `100%` : `calc(${Settings.width} * 1 / 3)`,
          minWidth: Media.isLarge ? '25%' : '60%',
        }
        if (!value?.src?.[0]) {
          console.warn('textBlock components img no value', value.src)
        }
        if (value?.src?.[0] != '/') {
          value.src = `/${value.src}`
        }
        if (value?.src?.includes('audio-description')) {
          return null
        }
        if (value?.src?.includes('icon_open')) {
          return null
        }
        //  console.log(value.src)
        return (<img src={value.items[0].src} alt={value.items[0].alt} style={NewStyle} width={value.items[0].width} height={value.items[0].height} />)
      },
    },
  }
  let TextBlockInnerStyle = {
    ...Settings.innerStyle,
    gap: Settings?.lowGap,
  }
  return (
    <StandardContainer id={Settings.id} style={Style} innerStyle={TextBlockInnerStyle} innerID={Settings.innerID} innerClassName={`StandardContainerInnerMargin`} {...props} >
      {
        groups?.map((group, index) => (
          <TextBlockGroup {...props} group={group} key={index} />
        ))}
    </StandardContainer>
  )
  function TextBlockGroup(props) {
    let log = true
    let { Settings, Style } = GetSettings(props, "TextBlockGroup");
      log === true && console.log(`TextBlockGroup ${props.group.length}`, props.group)
    let cleanGroup = props.group.filter(filterGroup)
      log === true && console.log(`TextBlockGroup (Clean) ${cleanGroup.length}`, cleanGroup, '\n')
    let imageItemCount = cleanGroup?.filter(item => item._type === 'img').length
    let hasImage = (imageItemCount > 0) ? true : false
    let image = cleanGroup?.filter(item => item._type === 'img')?.[0]
    let content = cleanGroup?.filter(item => item._type === 'block')
      log === true && console.log('hasImage', hasImage)
      log === true && console.log(`TextBlockGroup Group content ${props.group.length}`, content)
      log === true && console.log(`TextBlockGroup Group image ${props.group.length}`, image)
    if (cleanGroup.length == 0) {
      log === true && console.log('return null')
      return null
    }
      log === true && console.log('cleanGroup', cleanGroup)
    cleanGroup[0].first = true
    let pattern1, pattern2, pattern3, pattern4

    if (hasImage) {
      pattern1 = ((cleanGroup.length === 2) && (cleanGroup?.[0].style === 'normal'))
      pattern2 = ((cleanGroup.length > 2) && (cleanGroup?.[0].style === 'h2' || cleanGroup?.[0].style === 'h3' || cleanGroup?.[0].style === 'h4' || cleanGroup?.[0]._type === 'img'))
      pattern3 = ((cleanGroup.length === 3) && (cleanGroup?.[0].style === 'normal'))
      pattern4 = ((cleanGroup.length > 3) && (cleanGroup?.[0].style === 'normal'))
      log === true && console.log(`pattern1`, pattern1)
      log === true && console.log(`pattern2`, pattern2)
      log === true && console.log(`pattern3`, pattern3)
      log === true && console.log(`pattern4`, pattern4)
    }
    let pattern1Style = {
      display: 'grid',
      gridTemplateColumns: hasImage ? '3fr 2fr' : null
    }
    let pattern2Style = {
      display: 'block',
    }
    let pattern2ImgStyle = {
      float: 'right',
      padding: Settings.lowPadding
    }
    let pattern2ContentStyle = {
      paddingTop: Settings.lowPadding
    }
    let pattern3Style = {
      display: 'grid',
      gridTemplateColumns: hasImage ? '3fr 2fr' : null
    }
    let TextBlockGroupStyleInner = {
      gap: Settings?.lowGap,
      margin: 'unset',
      width: '100%',
    }
    if (pattern1) {
      TextBlockGroupStyleInner = { ...TextBlockGroupStyleInner, ...pattern1Style }
    }
    if (pattern2) {
      TextBlockGroupStyleInner = { ...TextBlockGroupStyleInner, ...pattern2Style }
      image.Style = { ...pattern2ImgStyle }
      if (content) {
        for (let item of content) {
          log = false
          log === true && console.log('if (content) { item', item)
          item.Style = { ...pattern2ContentStyle }
          for (let child of item.children) {
            log === true && console.log('if (content) { child', child)
            child.Style = { ...pattern2ContentStyle }
          }
        }
      }
    }
    if (pattern3) {
      TextBlockGroupStyleInner = { ...TextBlockGroupStyleInner, ...pattern3Style }
    }
    if (pattern4) {
      TextBlockGroupStyleInner = { ...TextBlockGroupStyleInner, ...pattern2Style }
      image.Style = { ...pattern2ImgStyle }
    }

    return (
      <StandardContainer  {...props} id={Settings.id} style={Style} innerStyle={TextBlockGroupStyleInner} innerID={Settings.innerID} innerClassName={`StandardContainerInnerMargin`}>
        <PortableText
          value={cleanGroup}
          components={components}
        />
      </StandardContainer>
    )
  }
  function filterContent(data) {//Clean up console logs when happy w it.
    log = true
    log === true && console.log('filterContent data', data)
    log === true && console.log('typeof(data)', typeof (data))
    log === true && console.log('isArray', Array.isArray(data[0]));

    let filteredItems = []
    if (Array.isArray(data[0])) {
      for (let [indexOuter, group] of Object.entries(data)) {//extracted data (array)
        if (!group) { continue }
        for (let [indexInner, item] of Object.entries(group)) {//extracted data item (array) 
          if (!item) { continue }
          let hasContent = false
          if (item?._type === 'img' && item?.src.includes('icon_open_new_window')) {//test 1
            delete data[indexOuter][indexInner]
            continue
          }
          if (item?._type === 'block') {
            if (!item?.children) {//test 1
              delete data[indexOuter][indexInner]
              continue
            }
            for (let [indexChild, child] of Object.entries(item?.children)) { //test 2
              if (child.text.length > 0) {
                hasContent = true
              }
            }
          }
          else {// Passed the filters
            hasContent = true
          }
          if (hasContent) {
            filteredItems.push(data[indexOuter][indexInner])
            //console.log(`\n item ${indexInner} Passed`)
          }
        }
      }
    }
    else { // Support for pre extractedData[[][]] handled by GroupWrapper Functions in many components
      for (let [index, item] of Object.entries(data)) {//extracted data item (array) 
        if (!item) { continue }
        let hasContent = false
        if (item?._type === 'img' && item?.src.includes('icon_open_new_window')) {//test 1
          delete data[index]
          continue
        }
        if (item?._type === 'block') {
          if (!item?.children) {//test 1
            delete data[index]
            continue
          }
          for (let [indexChild, child] of Object.entries(item?.children)) { //test 2
            if (child.text.length > 0) {
              hasContent = true
            }
          }
        }
        else {// Passed the filters
          hasContent = true
        }
        if (hasContent) {
          filteredItems.push(data[index])
          //console.log(`\n item ${indexInner} Passed`)
        }
      }
    }

    return filteredItems
  }
  function filterGroup(groupItem) {
    log = false
    //console.log(`filterGroup(groupItem groupItem`,groupItem)
    log === true && console.log(`groupItem`, groupItem)
    let cleanedItem
    if (groupItem?.children) {
      cleanedItem = groupItem?.children?.filter(filterGroupItemChildren)?.[0]
    }
    else if (groupItem?.src?.includes('icon-close-window.gif')) {
      cleanedItem = null
    }
    else {
      cleanedItem = groupItem
    }

    function filterGroupItemChildren(child) {
      // console.log(`filterGroupItemChildren child`,child)
      if (child?.text === " ") {
        log === true && console.log(`filterGroupItemChildren  (child.text === " ") {`)
        return false;
      }
      if (child?.text === " ") {
        log === true && console.log(`filterGroupItemChildren  (child.text === " ") {`)
        return false;
      }
      return child;
    }
    log === true && console.log(`cleanedItem`, cleanedItem)
    return cleanedItem ? cleanedItem : false
  }
  function filterChildren2(child) {
    if (child === "") {
      return false;
    }
    if (child?.type?.name === "DefaultHardBreak") {
      return false
    }
    return true;
  }
  function handleCrawlContent(data) {
    if (data?.targetingPattern?.includes('.headline')) {
      console.error(` if (data?.targetingPattern?.includes('.headline')) {`)
      data.extractedData[0][0].style = 'headline'
    }
  }
  function getContentGroups(data) {
    let log = false
    log === true && console.log('getContentGroups props', data)
    let items = data
    let groups = getItemsGroups()
    log === true && console.log('\n\n getContentGroups groups', groups)
    function getItemsGroups() {
      let groups = []
      let currentGroup = []
      for (let [index, item] of items.entries()) {
        log === true && console.log('items item', index, ":", item)
        if ((items[index + 1]?._type === 'img') || (item.style === 'h2') || (item.style === 'h3') || (item.style === 'h4')) { // next item is an image, new group and start it with this item (text left of (or above image)
          log === true && console.log('Starting New Group')
          if (index != 0) {
            groups.push(currentGroup)
            currentGroup = []
          }
          currentGroup.push(item)
        }
        else if (item._type === 'img') {// item is an image check if next item is small text if so group with image
          log === true && console.log('THIS ITEM IS AN IMAGE')
          currentGroup.push(item)
        }
        else {
          currentGroup.push(item)
        }
      }
      groups.push(currentGroup)
      return groups
    }
    return groups
  }
}